import { Lambda } from "@aws-sdk/client-lambda";
import { S3 } from "@aws-sdk/client-s3";
import { SNS } from "@aws-sdk/client-sns";
import { SQS } from "@aws-sdk/client-sqs";
import { getDb } from "@kayakthedev/lib";
import esbuild from "esbuild";
import { backOff } from "exponential-backoff";
import fs from "fs";
import { Redis } from "ioredis";
import JSZip from "jszip";
import path from "path";

const lambda = new Lambda({ region: "eu-west-1" });
const sns = new SNS({ region: "eu-west-1" });
const sqs = new SQS({ region: "eu-west-1" });
const s3 = new S3({ region: "eu-west-1" });

const redisClient = new Redis(
  6379,
  "redis://redis-cyg7zh.serverless.euw1.cache.amazonaws.com",
  {
    tls: {
      checkServerIdentity: (servername, cert) => {
        // skip certificate hostname validation
        return undefined;
      },
    },
  }
);

const db = getDb({
  dbUrl: process.env.DATABASE_URL!,
});

const VERSION = process.env.VERSION!;
const MODE = process.env.MODE as "new" | "update";
const CURR_DIR = process.env.CURR_DIR!;
const DEPLOYMENT_ID = process.env.DEPLOYMENT_ID!;
const HANDLER_ID = process.env.HANDLER_ID!;
const SOURCE_BUCKET = process.env.SOURCE_BUCKET!;
const SOURCE_PREFIX = process.env.SOURCE_PREFIX!;
const POLLING_URL = process.env.POLLING_URL!;
const CHAIN_SNS = process.env.CHAIN_SNS!;
const HANDLER_ENVS = (
  JSON.parse(process.env.HANDLER_ENVS!) as Array<{
    key: string;
    value: string;
  }>
).reduce(
  (acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  },
  {} as Record<string, string>
);

const MANIFEST_BUCKET = "ingest-fetch-logs";
const MANIFEST_PREFIX = path.join("manifests", HANDLER_ID + ".json");

const HANDLER_SRC_FILE = path.join(CURR_DIR, SOURCE_PREFIX + ".js");
const BUNDLE_SRC_DIR = path.join(CURR_DIR, "bundle_src");
const BUNDLE_OUT_DIR = path.join(CURR_DIR, "bundle_out");
const RUNTIME_SRC_FILE = path.join(CURR_DIR, "runtime.js");
const EVENTS_RUNTIME_SRC_FILE = path.join(CURR_DIR, "events-runtime.js");
const BUNDLE_OUT_FILE = path.join(BUNDLE_OUT_DIR, "index.js");
const EVENTS_OUT_FILE = path.join(BUNDLE_OUT_DIR, "events-index.js");

main();

async function main() {
  await downloadFile();
  await prepareBundle();
  await zipLambda();
  await zipEventsLambda();

  if (MODE === "new") {
    await createPipelineState();
    const { eventsLambdaArn } = await allocateResources();
    await initialiseHandler({
      eventsLambdaArn,
    });
  }

  if (MODE === "update") {
    const handler = await db.query.handler.findFirst({
      where(fields, { eq }) {
        return eq(fields.id, Number(HANDLER_ID));
      },
    });

    // if (!handler || !handler.handlerArn) {
    //   throw new Error("Handler not found or handler ARN not present");
    // }

    // await updateFunctionCode({
    //   eventsArn: "",
    //   handlerArn: handler.handlerArn,
    // });
  }

  process.exit(0);
}

async function downloadFile() {
  const object = await s3.getObject({
    Bucket: SOURCE_BUCKET,
    Key: SOURCE_PREFIX,
  });

  fs.mkdirSync(HANDLER_SRC_FILE.split("/").slice(0, -1).join("/"), {
    recursive: true,
  });
  fs.writeFileSync(HANDLER_SRC_FILE, await object.Body?.transformToString()!);
}

async function prepareBundle() {
  fs.mkdirSync(BUNDLE_OUT_DIR, { recursive: true });
  fs.mkdirSync(BUNDLE_SRC_DIR, { recursive: true });

  fs.copyFileSync(HANDLER_SRC_FILE, path.join(BUNDLE_SRC_DIR, "pipeline.js"));
}

async function zipLambda() {
  fs.copyFileSync(RUNTIME_SRC_FILE, path.join(BUNDLE_SRC_DIR, "index.js"));

  await esbuild.build({
    entryPoints: [path.join(BUNDLE_SRC_DIR, "index.js")],
    bundle: true,
    minify: false,
    outfile: BUNDLE_OUT_FILE,
    nodePaths: [process.env.NODE_PATH!],
    target: "node10.4",
    platform: "node",
  });

  const content = fs.readFileSync(BUNDLE_OUT_FILE);

  const zip = new JSZip();
  zip.file("index.js", content.toString());

  const zipData = await zip.generateAsync({ type: "uint8array" });

  const bucket = "ingest-build-outputs";
  const key = path.join("outputs", HANDLER_ID + ".zip");

  await s3.putObject({
    Bucket: bucket,
    Key: key,
    Body: zipData,
  });
}

async function zipEventsLambda() {
  fs.copyFileSync(
    EVENTS_RUNTIME_SRC_FILE,
    path.join(BUNDLE_SRC_DIR, "events-index.js")
  );

  await esbuild.build({
    entryPoints: [path.join(BUNDLE_SRC_DIR, "events-index.js")],
    bundle: true,
    minify: true,
    outfile: EVENTS_OUT_FILE,
    nodePaths: [process.env.NODE_PATH!],
    target: "node10.4",
    platform: "node",
  });

  const content = fs.readFileSync(EVENTS_OUT_FILE);

  const zip = new JSZip();
  zip.file("index.js", content.toString());
  const zipData = await zip.generateAsync({ type: "uint8array" });

  const bucket = "ingest-build-outputs";
  const key = path.join("outputs", HANDLER_ID + "-events.zip");

  await s3.putObject({
    Bucket: bucket,
    Key: key,
    Body: zipData,
  });
}

async function allocateResources() {
  const transactionQueue = await sqs.createQueue({
    QueueName: `tx-queue-${HANDLER_ID}.fifo`,
    Attributes: {
      FifoQueue: "true",
      VisibilityTimeout: "900",
    },
  });

  if (!transactionQueue.QueueUrl) {
    throw new Error("Queue URL is undefined");
  }

  const logFetcher = await lambda.createFunction({
    FunctionName: `log-fetcher-${HANDLER_ID}`,
    Role: "arn:aws:iam::730335604495:role/orchestrator-lambda",
    Code: {
      S3Bucket: "ingest-functions",
      S3Key: `log-fetcher/${VERSION}.zip`,
    },
    Environment: {
      Variables: {
        TRANSACTION_QUEUE_URL: transactionQueue.QueueUrl!,
        MANIFEST_BUCKET,
        MANIFEST_PREFIX,
        NODE_ENDPOINT: POLLING_URL,
        HANDLER_ID,
        VERSION,
      },
    },
    Timeout: 200,
    Handler: "bootstrap",
    PackageType: "Zip",
    Runtime: "provided.al2023",
  });

  if (!logFetcher.FunctionArn) {
    throw new Error("Function ARN is undefined");
  }

  const createOrchestrator = await lambda.createFunction({
    FunctionName: `orchestrator-${HANDLER_ID}`,
    Role: "arn:aws:iam::730335604495:role/orchestrator-lambda",
    Code: {
      S3Bucket: "ingest-functions",
      S3Key: `orchestrator/${VERSION}.zip`,
    },
    VpcConfig: {
      SecurityGroupIds: ["sg-08b95d721fc52088f"],
      SubnetIds: ["subnet-0d588c105766713a1"],
    },
    Environment: {
      Variables: {
        TRANSACTION_QUEUE_URL: transactionQueue.QueueUrl!,
        LOG_FETCHER_LAMBDA_ARN: logFetcher.FunctionArn,
        MANIFEST_BUCKET,
        MANIFEST_PREFIX,
        NODE_ENDPOINT: POLLING_URL,
        HANDLER_ID: HANDLER_ID,
        VERSION,
      },
    },
    Timeout: 200,
    Handler: "bootstrap",
    PackageType: "Zip",
    Runtime: "provided.al2023",
  });

  if (!createOrchestrator.FunctionArn) {
    throw new Error("Function ARN is undefined");
  }

  await lambda.putFunctionConcurrency({
    FunctionName: createOrchestrator.FunctionArn,
    ReservedConcurrentExecutions: 1,
  });

  const handlerLambda = await lambda.createFunction({
    FunctionName: `handler-${HANDLER_ID}`,
    Role: "arn:aws:iam::730335604495:role/orchestrator-lambda",
    Code: {
      S3Bucket: "ingest-build-outputs",
      S3Key: path.join("outputs", HANDLER_ID + ".zip"),
    },
    // VpcConfig: {
    //   SecurityGroupIds: ["sg-08b95d721fc52088f"],
    //   SubnetIds: ["subnet-05d39f2476de29dc7"],
    // },
    Environment: {
      Variables: {
        HANDLER_ID,
        ...HANDLER_ENVS,
      },
    },
    Layers: [
      `arn:aws:lambda:eu-west-1:730335604495:layer:extension-${VERSION.replaceAll(".", "-")}:1`,
    ],
    Timeout: 900,
    MemorySize: 512,
    Handler: "index.handler",
    PackageType: "Zip",
    Runtime: "nodejs20.x",
  });

  if (!handlerLambda.FunctionArn) {
    throw new Error("Function ARN is undefined");
  }

  const eventsLambda = await lambda.createFunction({
    FunctionName: `events-${HANDLER_ID}`,
    Role: "arn:aws:iam::730335604495:role/orchestrator-lambda",
    Code: {
      S3Bucket: "ingest-build-outputs",
      S3Key: path.join("outputs", HANDLER_ID + "-events.zip"),
    },
    Environment: {
      Variables: {
        INGEST_DEPLOYMENT_ID: DEPLOYMENT_ID,
      },
    },
    Timeout: 200,
    Handler: "index.handler",
    PackageType: "Zip",
    Runtime: "nodejs20.x",
  });

  if (!handlerLambda.FunctionArn) {
    throw new Error("Function ARN is undefined");
  }

  let attributes = await sqs.getQueueAttributes({
    QueueUrl: transactionQueue.QueueUrl,
    AttributeNames: ["QueueArn"],
  });

  const createQueueSub = await lambda.createEventSourceMapping({
    EventSourceArn: attributes.Attributes!.QueueArn,
    FunctionName: handlerLambda.FunctionArn,
    BatchSize: 10,
  });

  const permissionResponse = await lambda.addPermission({
    FunctionName: createOrchestrator.FunctionArn,
    StatementId: `${HANDLER_ID}`,
    Action: "lambda:InvokeFunction",
    Principal: "sns.amazonaws.com",
    SourceArn: CHAIN_SNS,
  });

  const createSubscriptionResponse = await sns.subscribe({
    TopicArn: CHAIN_SNS,
    Protocol: "lambda",
    Endpoint: createOrchestrator.FunctionArn,
  });

  return {
    eventsLambdaArn: eventsLambda.FunctionArn!,
  };
}

async function updateFunctionCode(options: {
  eventsArn: string;
  handlerArn: string;
}) {
  await lambda.updateFunctionCode({
    FunctionName: `events-${HANDLER_ID}`,
    S3Bucket: "ingest-build-outputs",
    S3Key: path.join("outputs", HANDLER_ID + "-events.zip"),
  });
  await lambda.updateFunctionCode({
    FunctionName: `handler-${HANDLER_ID}`,
    S3Bucket: "ingest-build-outputs",
    S3Key: path.join("outputs", HANDLER_ID + ".zip"),
  });
}

async function initialiseHandler(opts: { eventsLambdaArn: string }) {
  await backOff(
    async () => {
      const { Payload } = await lambda.invoke({
        FunctionName: opts.eventsLambdaArn,
        Payload: JSON.stringify({
          type: "Create",
        }),
      });

      if (!Payload) return;
    },
    {
      numOfAttempts: 3,
      delayFirstAttempt: true,
      startingDelay: 1000,
      maxDelay: 3000,
    }
  );
}

async function createPipelineState() {
  redisClient.on("error", (err) => console.log("Redis redisClient Error", err));

  console.log("Connecting to redis");
  await redisClient.call(
    "JSON.SET",
    HANDLER_ID,
    "$",
    JSON.stringify({
      HandlerId_: HANDLER_ID,
      State_: "IDLE",
    })
  );

  await redisClient.set(`tx-count-${HANDLER_ID}`, 0);

  console.log("Disonnecting to redis");
}

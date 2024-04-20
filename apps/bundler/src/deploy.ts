import {
  AddPermissionCommand,
  CreateEventSourceMappingCommand,
  CreateFunctionCommand,
  LambdaClient,
} from "@aws-sdk/client-lambda";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { SNSClient, SubscribeCommand } from "@aws-sdk/client-sns";
import {
  CreateQueueCommand,
  GetQueueAttributesCommand,
  SQSClient,
} from "@aws-sdk/client-sqs";
import esbuild from "esbuild";
import fs from "fs";
import JSZip from "jszip";
import path from "path";

const lambdaClient = new LambdaClient({ region: "eu-west-1" });
const snsClient = new SNSClient({ region: "eu-west-1" });
const sqsClient = new SQSClient({ region: "eu-west-1" });
const s3Client = new S3Client({ region: "eu-west-1" });

async function createFunctions(options: {
  file: string;
  zipBucket: string;
  zipKey: string;
  manifestBucket: string;
  manifestKey: string;
}) {
  const { file, zipBucket, zipKey, manifestBucket, manifestKey } = options;

  const { default: pipeline } = await import(file);
  const chainId = pipeline.chain.id;

  const producerConfig = await getProducerConfig(chainId);

  const transactionQueue = await sqsClient.send(
    new CreateQueueCommand({
      QueueName: `tx-queue-${process.env.DEPLOYMENT_ID}-${path.parse(file).base.split(".")[0]}.fifo`,
      Attributes: {
        FifoQueue: "true",
        VisibilityTimeout: "250",
      },
    })
  );

  if (!transactionQueue.QueueUrl) {
    throw new Error("Queue URL is undefined");
  }

  const logFetcher = await lambdaClient.send(
    new CreateFunctionCommand({
      FunctionName: `log-fetcher-${process.env.DEPLOYMENT_ID}-${path.parse(file).base.split(".")[0]}`,
      Role: "arn:aws:iam::730335604495:role/orchestrator-lambda",
      Code: {
        S3Bucket: "ingest-functions",
        S3Key: "log-fetcher.zip",
      },
      Environment: {
        Variables: {
          TRANSACTION_QUEUE_URL: transactionQueue.QueueUrl!,
          MANIFEST_BUCKET: manifestBucket,
          MANIFEST_PREFIX: manifestKey,
          NODE_ENDPOINT: producerConfig.pollingUrl,
        },
      },
      Timeout: 200,
      Handler: "bootstrap",
      PackageType: "Zip",
      Runtime: "provided.al2023",
    })
  );

  if (!logFetcher.FunctionArn) {
    throw new Error("Function ARN is undefined");
  }

  const createOrchestrator = await lambdaClient.send(
    new CreateFunctionCommand({
      FunctionName: `${process.env.DEPLOYMENT_ID}-${path.parse(file).base.split(".")[0]}`,
      Role: "arn:aws:iam::730335604495:role/orchestrator-lambda",
      Code: {
        S3Bucket: "ingest-functions",
        S3Key: "orchestrator.zip",
      },
      Environment: {
        Variables: {
          TRANSACTION_QUEUE_URL: transactionQueue.QueueUrl!,
          LOG_FETCHER_LAMBDA_ARN: logFetcher.FunctionArn,
          MANIFEST_BUCKET: manifestBucket,
          MANIFEST_PREFIX: manifestKey,
          NODE_ENDPOINT: producerConfig.pollingUrl,
        },
      },
      Timeout: 200,
      Handler: "bootstrap",
      PackageType: "Zip",
      Runtime: "provided.al2023",
    })
  );

  if (!createOrchestrator.FunctionArn) {
    throw new Error("Function ARN is undefined");
  }

  const handlerLambda = await lambdaClient.send(
    new CreateFunctionCommand({
      FunctionName: `handler-${process.env.DEPLOYMENT_ID}-${path.parse(file).base.split(".")[0]}`,
      Role: "arn:aws:iam::730335604495:role/orchestrator-lambda",
      Code: {
        S3Bucket: zipBucket,
        S3Key: zipKey,
      },
      Environment: {},
      Timeout: 200,
      Handler: "index.handler",
      PackageType: "Zip",
      Runtime: "nodejs20.x",
    })
  );

  if (!handlerLambda.FunctionArn) {
    throw new Error("Function ARN is undefined");
  }

  let attributes = await sqsClient.send(
    new GetQueueAttributesCommand({
      QueueUrl: transactionQueue.QueueUrl,
      AttributeNames: ["QueueArn"],
    })
  );

  const createQueueSub = await lambdaClient.send(
    new CreateEventSourceMappingCommand({
      EventSourceArn: attributes.Attributes!.QueueArn,
      FunctionName: handlerLambda.FunctionArn,
      BatchSize: 1,
    })
  );

  const permissionResponse = await lambdaClient.send(
    new AddPermissionCommand({
      FunctionName: createOrchestrator.FunctionArn,
      StatementId: `${process.env.DEPLOYMENT_ID}-${path.parse(file).base.split(".")[0]}`,
      Action: "lambda:InvokeFunction",
      Principal: "sns.amazonaws.com",
      SourceArn: `arn:aws:sns:eu-west-1:730335604495:${chainId}`,
    })
  );

  const createSubscriptionResponse = await snsClient.send(
    new SubscribeCommand({
      TopicArn: `arn:aws:sns:eu-west-1:730335604495:${chainId}`,
      Protocol: "lambda",
      Endpoint: createOrchestrator.FunctionArn,
    })
  );
}

async function createManifest(file: string) {
  const { default: pipeline } = await import(file);

  const manifest = {
    chain: {
      url: "https://eth-mainnet.g.alchemy.com/v2/XDvWw6uVqbY0ZR8gKK18NtSc7rJnsNoB",
    },
    tx_configs: Object.entries(pipeline.handlers).map(
      ([name, handler]: [string, any]) => ({
        id: name,
        address: "0x",
        log_configs: Object.entries(handler.transaction._logs).map(
          ([name, log_config]: [string, any]) => ({
            name,
            address: log_config._origin,
            topics: [
              "ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
            ],
          })
        ),
      })
    ),
  };

  const bucket = "ingest-fetch-logs";
  const key = path.join("manifests", path.basename(file) + ".json");
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: JSON.stringify(manifest),
    })
  );
  return { bucket, key };
}

async function getProducerConfig(id: string) {
  const r = await fetch(
    process.env.INGEST_API! + "/api/external/producer/" + id
  );
  const data = await r.json();
  return data as {
    pollingUrl: string;
  };
}

async function zipLambda(file: string) {
  const fileName = path.basename(file);

  const toBundleDir = path.join(process.env.CURR_DIR!, fileName, "to_bundle");
  const bundleOutDir = path.join(process.env.CURR_DIR!, fileName, "out");

  fs.mkdirSync(toBundleDir, {
    recursive: true,
  });
  fs.mkdirSync(bundleOutDir, { recursive: true });

  fs.copyFileSync(file, path.join(toBundleDir, "pipeline.js"));
  fs.copyFileSync(
    path.join(process.env.CURR_DIR!, "runtime.js"),
    path.join(toBundleDir, "index.js")
  );

  await esbuild.build({
    entryPoints: [path.join(toBundleDir, "index.js")],
    bundle: true,
    outfile: path.join(bundleOutDir, "index.js"),
    nodePaths: [process.env.NODE_PATH!],
    target: "node10.4",
    platform: "node",
  });

  const content = fs.readFileSync(path.join(bundleOutDir, "index.js"));

  const zip = new JSZip();
  zip.file("index.js", content.toString());

  const zipData = await zip.generateAsync({ type: "uint8array" });

  const bucket = "ingest-build-outputs";
  const key = path.join(
    process.env.DEPLOYMENT_ID!,
    path.basename(file) + ".zip"
  );
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: zipData,
    })
  );

  return {
    bucket,
    key,
  };
}

async function main() {
  const files = fs.readdirSync(process.env.OUT_DIR!);

  const promises = [];
  for (const file of files) {
    const fullPath = path.join(process.env.OUT_DIR!, file);

    promises.push(
      (async () => {
        const { bucket: zipBucket, key: zipKey } = await zipLambda(fullPath);
        const { bucket: manifestBucket, key: manifestKey } =
          await createManifest(fullPath);
        await createFunctions({
          file: fullPath,
          zipBucket,
          zipKey,
          manifestBucket,
          manifestKey,
        });
      })()
    );
  }

  await Promise.all(promises);
}

main();

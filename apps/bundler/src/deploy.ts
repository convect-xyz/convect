import { Lambda } from "@aws-sdk/client-lambda";
import { S3 } from "@aws-sdk/client-s3";
import esbuild from "esbuild";
import { backOff } from "exponential-backoff";
import fs from "fs";
import { Redis } from "ioredis";
import JSZip from "jszip";
import path from "path";

const lambda = new Lambda({ region: "eu-west-1" });
const s3 = new S3({ region: "eu-west-1" });

const redisClient = new Redis(
  6379,
  "rediss://default:REDACTED@stirred-jawfish-46999.upstash.io",
  {
    tls: {
      checkServerIdentity: (servername, cert) => {
        return undefined;
      },
    },
  }
);

const VERSION = process.env.VERSION!;
const MODE = process.env.MODE as "init" | "update";
const CURR_DIR = process.env.CURR_DIR!;
const DEPLOYMENT_ID = process.env.DEPLOYMENT_ID!;
const HANDLER_ID = process.env.HANDLER_ID!;
const SOURCE_BUCKET = process.env.SOURCE_BUCKET!;
const SOURCE_PREFIX = process.env.SOURCE_PREFIX!;
const HANDLER_SRC_FILE = path.join(CURR_DIR, SOURCE_PREFIX + ".js");
const BUNDLE_SRC_DIR = path.join(CURR_DIR, "bundle_src");
const BUNDLE_OUT_DIR = path.join(CURR_DIR, "bundle_out");
const RUNTIME_SRC_FILE = "/scripts/runtime.js";
const EVENTS_RUNTIME_SRC_FILE = "/scripts/events-runtime.js";
const BUNDLE_OUT_FILE = path.join(BUNDLE_OUT_DIR, "index.js");
const EVENTS_OUT_FILE = path.join(BUNDLE_OUT_DIR, "events-index.js");

main();

async function main() {
  await downloadFile();
  await prepareBundle();
  await zipLambda();
  await zipEventsLambda();

  if (MODE === "init") {
    await createPipelineState();
    // const { eventsLambdaArn } = await allocateResources();
    // await initialiseHandler({
    //   eventsLambdaArn,
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
  const key = path.join("outputs", HANDLER_ID, DEPLOYMENT_ID + ".zip");

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
  const key = path.join("outputs", HANDLER_ID, DEPLOYMENT_ID + "-events.zip");

  await s3.putObject({
    Bucket: bucket,
    Key: key,
    Body: zipData,
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
  await redisClient.set(`processed-tx-count-${HANDLER_ID}`, 0);

  console.log("Disonnecting from redis");
}

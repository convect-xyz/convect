import { S3 } from "@aws-sdk/client-s3";
import { InlineProgramArgs, LocalWorkspace } from "@pulumi/pulumi/automation";
import esbuild from "esbuild";
import fs from "fs";
import JSZip from "jszip";
import path from "path";
import infraFactory from "./infra";

const s3 = new S3({ region: "eu-west-1" });

const MODE = process.env.MODE as "init" | "update" | "destroy";
const CURR_DIR = process.env.CURR_DIR!;
const DEPLOYMENT_ID = process.env.DEPLOYMENT_ID!;
const HANDLER_ID = process.env.HANDLER_ID!;
const HANDLER_VERSION = process.env.HANDLER_VERSION!;
const SOURCE_BUCKET = process.env.SOURCE_BUCKET!;
const SOURCE_PREFIX = process.env.SOURCE_PREFIX!;
const HANDLER_SRC_FILE = path.join(CURR_DIR, SOURCE_PREFIX + ".js");
const BUNDLE_SRC_DIR = path.join(CURR_DIR, "bundle_src");
const BUNDLE_OUT_DIR = path.join(CURR_DIR, "bundle_out");
const RUNTIME_SRC_FILE = "/scripts/runtime.js";
const BUNDLE_OUT_FILE = path.join(BUNDLE_OUT_DIR, "index.js");

main();

async function main() {
  await downloadFile();
  await prepareBundle();
  await zipLambda();

  const stack = await getStack();

  if ((MODE === "init" && Number(HANDLER_VERSION) > 0) || MODE === "destroy") {
    await stack.destroy();
  }

  if (["init", "update"].includes(MODE)) {
    await stack.up();
  }

  process.exit(0);
}

async function getStack() {
  const args: InlineProgramArgs = {
    stackName: HANDLER_ID,
    projectName: "convect-v1",
    program: infraFactory,
  };

  if (MODE === "init") {
    return LocalWorkspace.createOrSelectStack(args);
  }

  if (MODE === "update") {
    return LocalWorkspace.selectStack(args);
  }

  if (MODE === "destroy") {
    return LocalWorkspace.selectStack(args);
  }

  throw new Error("Unknown mode");
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

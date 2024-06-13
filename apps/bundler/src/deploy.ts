import { S3 } from "@aws-sdk/client-s3";
import { InlineProgramArgs, LocalWorkspace } from "@pulumi/pulumi/automation";
import esbuild from "esbuild";
import fs from "fs";
import JSZip from "jszip";
import path from "path";
import { env } from "./env";
import infraFactory from "./infra";

const s3 = new S3({ region: "eu-west-1" });

const HANDLER_SRC_FILE = path.join(env.CURR_DIR, env.SOURCE_PREFIX + ".js");
const BUNDLE_SRC_DIR = path.join(env.CURR_DIR, "bundle_src");
const BUNDLE_OUT_DIR = path.join(env.CURR_DIR, "bundle_out");
const RUNTIME_SRC_FILE = "/scripts/runtime.js";
const BUNDLE_OUT_FILE = path.join(BUNDLE_OUT_DIR, "index.js");

main();

async function main() {
  console.info("initialising/getting stack...");
  const stack = await getStack();
  console.info("succesfully intialised stack.");

  console.info("installing aws plugin...");
  await stack.workspace.installPlugin("aws", "v6.37.0");
  await stack.setConfig("aws:region", { value: "eu-west-1" });
  console.info("aws plugin installed.");

  if (env.MODE === "destroy") {
    console.info("destroying stack...");
    await stack.destroy({ onOutput: console.info });
    console.info("stack destroyed");

    console.info("removing stack...");
    await stack.workspace.removeStack(stack.name);
    console.info("removed stack...");
    return;
  }

  await downloadFile();
  await prepareBundle();
  await zipLambda();

  if (env.MODE === "init") {
    if (Number(env.HANDLER_VERSION) > 0) {
      console.info("destroying stack...");
      await stack.destroy({ onOutput: console.info });
      console.info("stack destroyed");
    }
    console.info("stack up...");
    await stack.up({ onOutput: console.info });
    console.info("stack upped.");
  }

  if (env.MODE === "update") {
    console.info("stack up...");
    await stack.up({ onOutput: console.info });
    console.info("stack upped.");
  }

  process.exit(0);
}

async function getStack() {
  const args: InlineProgramArgs = {
    stackName: env.HANDLER_ID,
    projectName: "convect-v1",
    program: infraFactory,
  };

  if (env.MODE === "init") {
    return LocalWorkspace.createOrSelectStack(args);
  }

  if (env.MODE === "update") {
    return LocalWorkspace.selectStack(args);
  }

  if (env.MODE === "destroy") {
    return LocalWorkspace.selectStack(args);
  }

  throw new Error("Unknown mode");
}

async function downloadFile() {
  const object = await s3.getObject({
    Bucket: env.SOURCE_BUCKET,
    Key: env.SOURCE_PREFIX,
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
  const key = path.join(
    "outputs",
    env.HANDLER_ID,
    env.HANDLER_VERSION,
    env.DEPLOYMENT_ID + ".zip"
  );

  await s3.putObject({
    Bucket: bucket,
    Key: key,
    Body: zipData,
  });
}

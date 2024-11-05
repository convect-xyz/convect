import { S3 } from "@aws-sdk/client-s3";
import { InlineProgramArgs, LocalWorkspace } from "@pulumi/pulumi/automation";
import { eq } from "drizzle-orm";
import esbuild from "esbuild";
import fs from "fs";
import JSZip from "jszip";
import path from "path";
import { db } from "./db";
import schema from "./db/schema";
import infraFactory from "./infra";
import { getCurrentDeployment, getDeploymentTask } from "./task";

const s3 = new S3({ region: "eu-west-1" });

main();

async function main() {
  const deploymentTask = await getDeploymentTask();

  do {
    const mode = deploymentTask.currentDeployment!.mode;
    if (mode === "destroy") {
      await destroy();
    } else if (mode === "init") {
      await deploy();
    } else if (mode === "update") {
      await deploy();
    }
    await deploymentTask.next();
  } while (deploymentTask.currentDeployment);

  process.exit(0);
}

async function deploy() {
  const deploymentTask = await getDeploymentTask();

  db.update(schema.deployment)
    .set({
      status: "RUNNING",
      runningAt: new Date(),
    })
    .where(eq(schema.deployment.id, deploymentTask.currentDeployment!.id));

  console.info("initialising/getting stack...");
  const stack = await getStack();
  console.info("succesfully intialised stack.");

  console.info("setting aws config...");
  await stack.setConfig("aws:region", { value: "eu-west-1" });
  console.info("aws config set.");

  await downloadFile();
  await prepareBundle();
  await zipLambda();

  console.info("stack up...");
  await stack.up({ onOutput: console.info });
  console.info("stack upped.");
}

async function destroy() {
  console.info("initialising/getting stack...");
  const stack = await getStack();
  console.info("succesfully intialised stack.");

  console.info("destroying stack...");
  await stack.destroy({ onOutput: console.info });
  console.info("stack destroyed");

  console.info("removing stack...");
  await stack.workspace.removeStack(stack.name);
  console.info("removed stack...");
  return;
}

async function getStack() {
  const currentDeployment = await getCurrentDeployment();
  const mode = currentDeployment.mode;

  const args: InlineProgramArgs = {
    stackName: currentDeployment.function.globalId,
    projectName: "convect-v1",
    program: infraFactory,
  };

  if (mode === "init") {
    return LocalWorkspace.createOrSelectStack(args);
  }

  if (mode === "update") {
    return LocalWorkspace.selectStack(args);
  }

  if (mode === "destroy") {
    return LocalWorkspace.selectStack(args);
  }

  throw new Error("Unknown mode");
}

async function downloadFile() {
  const currentDeployment = await getCurrentDeployment();
  const task = await getDeploymentTask();
  const dirInfo = await task.getDirInfo();

  const object = await s3.getObject({
    Bucket: currentDeployment.sourceBucket,
    Key: currentDeployment.sourceKey,
  });

  fs.mkdirSync(dirInfo.handlerSrcFile.split("/").slice(0, -1).join("/"), {
    recursive: true,
  });
  fs.writeFileSync(
    dirInfo.handlerSrcFile,
    await object.Body?.transformToString()!
  );
}

async function prepareBundle() {
  const task = await getDeploymentTask();
  const dirInfo = await task.getDirInfo();
  fs.mkdirSync(dirInfo.bundleOutDir, { recursive: true });
  fs.mkdirSync(dirInfo.bundleSrcDir, { recursive: true });

  fs.copyFileSync(
    dirInfo.handlerSrcFile,
    path.join(dirInfo.bundleSrcDir, "pipeline.js")
  );
}

async function zipLambda() {
  const currentDeployment = await getCurrentDeployment();
  const deploymentTask = await getDeploymentTask();
  const dirInfo = await deploymentTask.getDirInfo();

  fs.copyFileSync(
    dirInfo.runtimeSrcFile,
    path.join(dirInfo.bundleSrcDir, "index.js")
  );

  await esbuild.build({
    entryPoints: [path.join(dirInfo.bundleSrcDir, "index.js")],
    bundle: true,
    minify: false,
    outfile: dirInfo.bundleOutFile,
    nodePaths: [process.env.NODE_PATH!],
    target: "node10.4",
    platform: "node",
  });

  const content = fs.readFileSync(dirInfo.bundleOutFile);

  const zip = new JSZip();
  zip.file("index.js", content.toString());

  const zipData = await zip.generateAsync({ type: "uint8array" });

  const bucket = "ingest-build-outputs";
  const key = path.join(
    "outputs",
    currentDeployment.functionId.toString(),
    deploymentTask.currentDeployment!.id + ".zip"
  );

  await s3.putObject({
    Bucket: bucket,
    Key: key,
    Body: zipData,
  });
}

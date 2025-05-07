import { S3 } from "@aws-sdk/client-s3";
import { InlineProgramArgs, LocalWorkspace } from "@pulumi/pulumi/automation";
import esbuild from "esbuild";
import fs from "fs";
import JSZip from "jszip";
import path from "path";
import infraFactory from "./infra";
import { DeploymentManager } from "./manager";

const s3 = new S3({ region: "eu-west-1" });

main();

async function main() {
  const manager = await DeploymentManager.getOrCreate();

  while (manager.current) {
    const current = manager.current;
    if (!current) throw new Error("No current deployment.");

    await current.start();

    try {
      const mode = current.deployment.mode;
      if (mode === "destroy") {
        await destroy();
      } else if (mode === "init") {
        await deploy();
      } else if (mode === "update") {
        await deploy();
      }
    } catch (e) {
      current.fail();
      throw e;
    }

    await manager.next();
  }

  process.exit(0);
}

async function deploy() {
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

  await DeploymentManager.getOrCreate().then((r) =>
    r.current?.removeDeployment()
  );

  return;
}

async function getStack() {
  const current = await DeploymentManager.getOrCreate().then((r) => r.current);
  if (!current) throw new Error("No current deployment.");

  const mode = current.deployment.mode;

  const args: InlineProgramArgs = {
    stackName: current.deployment.function.globalId,
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
  const current = await DeploymentManager.getOrCreate().then((r) => r.current);
  if (!current) throw new Error("No current deployment.");

  const dirInfo = await current.getDirInfo();

  const object = await s3.getObject({
    Bucket: current.deployment.sourceBucket,
    Key: current.deployment.sourceKey,
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
  const current = await DeploymentManager.getOrCreate().then((r) => r.current);
  if (!current) throw new Error("No current deployment.");

  const dirInfo = await current.getDirInfo();
  fs.mkdirSync(dirInfo.bundleOutDir, { recursive: true });
  fs.mkdirSync(dirInfo.bundleSrcDir, { recursive: true });

  fs.copyFileSync(
    dirInfo.handlerSrcFile,
    path.join(dirInfo.bundleSrcDir, "pipeline.js")
  );
}

async function zipLambda() {
  const current = await DeploymentManager.getOrCreate().then((r) => r.current);
  if (!current) throw new Error("No current deployment.");

  const dirInfo = await current.getDirInfo();

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
    current.deployment.functionId.toString(),
    current.deployment.id + ".zip"
  );

  await s3.putObject({
    Bucket: bucket,
    Key: key,
    Body: zipData,
  });
}

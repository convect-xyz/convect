import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import config from "./config/config";

export = async () => {
  const stackName = pulumi.getStack();
  const GITHUB_SHA = process.env.GITHUB_SHA!;
  const ENVIRONMENT = process.env.ENVIRONMENT!;

  const lambda = archive.getFile({
    type: "zip",
    sourceFile: "./stripe.js",
    outputPath: "stripe_payload.zip",
  });

  const fn = new aws.lambda.Function("stripe", {
    code: new pulumi.asset.FileArchive("stripe_payload.zip"),
    name: "stripe_" + ENVIRONMENT,
    handler: "index.handler",
    sourceCodeHash: lambda.then(lambda => lambda.outputBase64sha256),
  });

  return {
    githubSha: pulumi.output(GITHUB_SHA),
  };
};

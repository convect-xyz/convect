import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export = async () => {
  const stackName = pulumi.getStack();
  const GITHUB_SHA = process.env.GITHUB_SHA!;
  const ENVIRONMENT = process.env.ENVIRONMENT!;

  const assumeRole = aws.iam.getPolicyDocument({
    statements: [
      {
        effect: "Allow",
        principals: [
          {
            type: "Service",
            identifiers: ["lambda.amazonaws.com"],
          },
        ],
        actions: ["sts:AssumeRole"],
      },
    ],
  });
  const iamForLambda = new aws.iam.Role("iam_for_lambda", {
    name: "iam_for_lambda",
    assumeRolePolicy: assumeRole.then((assumeRole) => assumeRole.json),
  });

  const lambda = archive.getFile({
    type: "zip",
    sourceFile: "./stripe.js",
    outputPath: "stripe_payload.zip",
  });

  const fn = new aws.lambda.Function("stripe", {
    code: new pulumi.asset.FileArchive("stripe_payload.zip"),
    name: "stripe_" + ENVIRONMENT,
    handler: "index.handler",
    role: iamForLambda.arn,
    sourceCodeHash: lambda.then((lambda) => lambda.outputBase64sha256),
  });

  return {
    githubSha: pulumi.output(GITHUB_SHA),
  };
};

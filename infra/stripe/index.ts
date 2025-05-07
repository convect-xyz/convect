import * as aws from "@pulumi/aws";
import * as archive from "@pulumi/archive";
import * as pulumi from "@pulumi/pulumi";

function getStripeApiKey(): string {
  switch (process.env.ENVIRONMENT) {
    case "prod":
      return process.env.PROD_STRIPE_API_KEY!;
    case "test":
      return process.env.TEST_STRIPE_API_KEY!;
    default:
      throw new Error("Unknown infra version");
  }
}

export = async () => {
  const stackName = pulumi.getStack();
  const GITHUB_SHA = process.env.GITHUB_SHA!;
  const ENVIRONMENT = process.env.ENVIRONMENT!;

  const sqsPolicy = aws.iam.getPolicyDocument({
    statements: [
      {
        effect: "Allow",
        actions: [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:GetQueueUrl",
          "sqs:ListQueues",
          "sqs:ListQueueTags",
        ],
        resources: ["*"],
      },
    ],
  });

  const cloudWatchPolicy = aws.iam.getPolicyDocument({
    statements: [
      {
        effect: "Allow",
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        resources: ["*"],
      },
    ],
  });

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
    inlinePolicies: [
      {
        name: "sqsPolicy",
        policy: sqsPolicy.then((sqsPolicy) => sqsPolicy.json),
      },
      {
        name: "cloudWatchPolicy",
        policy: cloudWatchPolicy.then(
          (cloudWatchPolicy) => cloudWatchPolicy.json
        ),
      },
    ],
  });

  const lambda = archive.getFile({
    type: "zip",
    sourceFile: "./stripe.js",
    outputPath: "stripe_payload.zip",
  });

  const fn = new aws.lambda.Function("stripe", {
    code: new pulumi.asset.FileArchive("stripe_payload.zip"),
    name: "stripe_" + ENVIRONMENT,
    handler: "stripe.handler",
    role: iamForLambda.arn,
    sourceCodeHash: lambda.then((lambda) => lambda.outputBase64sha256),
    runtime: "nodejs20.x",
    timeout: 900,
    environment: {
      variables: {
        STRIPE_API_KEY: getStripeApiKey(),
        DATABASE_URL: process.env.DATABASE_URL!,
      },
    },
  });

  return {
    githubSha: pulumi.output(GITHUB_SHA),
  };
};

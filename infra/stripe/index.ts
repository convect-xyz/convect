import * as archive from "@pulumi/archive";
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

const isMain = process.env.BRANCH_NAME === "main";
const isDev = process.env.BRANCH_NAME?.includes("dev") ?? false;

function getEnvironmentName(): string {
  if (isMain) {
    return "main";
  }
  if (isDev) {
    return "dev";
  }
  throw new Error("Unknown branch: " + process.env.BRANCH_NAME);
}

function getStripeApiKey(): string {
  if (isMain) {
    return process.env.PROD_STRIPE_API_KEY!;
  }
  if (isDev) {
    return process.env.TEST_STRIPE_API_KEY!;
  }

  throw new Error("Unknown branch: " + process.env.BRANCH_NAME);
}

function getDatabaseUrl(): string {
  if (isMain) {
    return process.env.PROD_APPLICATION_DB_URL!;
  }
  if (isDev) {
    return process.env.DEV_APPLICATION_DB_URL!;
  }

  throw new Error("Unknown branch: " + process.env.BRANCH_NAME);
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
    name: "iam_for_lambda" + getEnvironmentName(),
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
    sourceDir: "./out",
    outputPath: "stripe_payload.zip",
  });

  new aws.lambda.Function("stripe", {
    code: new pulumi.asset.FileArchive("stripe_payload.zip"),
    name: "stripe_" + getEnvironmentName(),
    handler: "stripe.handler",
    role: iamForLambda.arn,
    sourceCodeHash: lambda.then((lambda) => lambda.outputBase64sha256),
    runtime: "nodejs20.x",
    timeout: 900,
    environment: {
      variables: {
        STRIPE_API_KEY: getStripeApiKey(),
        DATABASE_URL: getDatabaseUrl(),
        SENTRY_DSN: process.env.SENTRY_DSN!,
        BRANCH_NAME: process.env.BRANCH_NAME!,
      },
    },
  });

  return {
    githubSha: pulumi.output(GITHUB_SHA),
  };
};

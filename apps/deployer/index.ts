import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import path = require("path");

const VERSION = process.env.VERSION!;
const org = "kayakthedev";

const stackRef = new pulumi.StackReference(`${org}/infra/${VERSION}`);

const HANDLER_ID = process.env.HANDLER_ID!;
const MANIFEST_BUCKET = "ingest-fetch-logs";
const MANIFEST_PREFIX = path.join("manifests", HANDLER_ID + ".json");
const POLLING_URL = process.env.POLLING_URL!;
const CHAIN_SNS = process.env.CHAIN_SNS!;
const DEPLOYMENT_ID = process.env.DEPLOYMENT_ID!;
const HANDLER_ENVS = (
  JSON.parse(process.env.HANDLER_ENVS!) as Array<{
    key: string;
    value: string;
  }>
).reduce(
  (acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  },
  {} as Record<string, string>
);

const transactionQueue = new aws.sqs.Queue(`tx-queue-${HANDLER_ID}`, {
  name: `tx-queue-${HANDLER_ID}.fifo`,
  visibilityTimeoutSeconds: 900,
  fifoQueue: true,
});

const logFetcher = new aws.lambda.Function(`log-fetcher-${HANDLER_ID}`, {
  name: `log-fetcher-${HANDLER_ID}`,
  role: "arn:aws:iam::730335604495:role/orchestrator-lambda",
  s3Bucket: "ingest-functions",
  s3Key: `log-fetcher/${VERSION}.zip`,
  environment: {
    variables: {
      TRANSACTION_QUEUE_URL: transactionQueue.url,
      MANIFEST_BUCKET,
      MANIFEST_PREFIX,
      NODE_ENDPOINT: POLLING_URL,
      HANDLER_ID,
      VERSION,
    },
  },
  timeout: 200,
  handler: "bootstrap",
  packageType: "Zip",
  runtime: "provided.al2023",
});

const orchestrator = new aws.lambda.Function(`orchestrator-${HANDLER_ID}`, {
  name: `orchestrator-${HANDLER_ID}`,
  role: "arn:aws:iam::730335604495:role/orchestrator-lambda",
  s3Bucket: "ingest-functions",
  s3Key: `orchestrator/${VERSION}.zip`,
  environment: {
    variables: {
      TRANSACTION_QUEUE_URL: transactionQueue.url,
      LOG_FETCHER_LAMBDA_ARN: logFetcher.arn,
      MANIFEST_BUCKET,
      MANIFEST_PREFIX,
      NODE_ENDPOINT: POLLING_URL,
      HANDLER_ID,
      VERSION,
    },
  },
  vpcConfig: {
    securityGroupIds: ["sg-08b95d721fc52088f"],
    subnetIds: ["subnet-0d588c105766713a1"],
  },
  timeout: 200,
  handler: "bootstrap",
  packageType: "Zip",
  runtime: "provided.al2023",
  reservedConcurrentExecutions: 1,
});

const handler = new aws.lambda.Function(`handler-${HANDLER_ID}`, {
  name: `handler-${HANDLER_ID}`,
  role: "arn:aws:iam::730335604495:role/orchestrator-lambda",
  s3Bucket: "ingest-build-outputs",
  s3Key: path.join("outputs", HANDLER_ID, DEPLOYMENT_ID + ".zip"),
  environment: {
    variables: {
      HANDLER_ID,
      MUST_REMOVE_CONVECT_TBK:
        "p.eyJ1IjogIjJlYjlhNzU2LWFjMDMtNDJmOC1iNGY2LWI2M2RhN2JiMjkyNiIsICJpZCI6ICJjZTE2YmI1Yi04NDBiLTQwNGMtYjk4Yi0zMjJiNDc4ZDMyYWEiLCAiaG9zdCI6ICJhd3MtZXUtY2VudHJhbC0xIn0.1Bvj9OA-NZQ0cU62T1sweLScNLMPsv8FIGaP8nkHoRw",
      ...HANDLER_ENVS,
    },
  },
  vpcConfig: {
    securityGroupIds: ["sg-08b95d721fc52088f"],
    subnetIds: ["subnet-0d588c105766713a1"],
  },
  layers: [stackRef.getOutput("outputs").apply((f) => f.handler_extension_arn)],
  timeout: 900,
  memorySize: 512,
  handler: "index.handler",
  packageType: "Zip",
  runtime: "nodejs20.x",
});

const events = new aws.lambda.Function(`events-${HANDLER_ID}`, {
  name: `events-${HANDLER_ID}`,
  role: "arn:aws:iam::730335604495:role/orchestrator-lambda",
  s3Bucket: "ingest-build-outputs",
  s3Key: path.join("outputs", HANDLER_ID, DEPLOYMENT_ID + "-events.zip"),
  environment: {
    variables: {
      HANDLER_ID,
      ...HANDLER_ENVS,
    },
  },
  vpcConfig: {
    securityGroupIds: ["sg-08b95d721fc52088f"],
    subnetIds: ["subnet-0d588c105766713a1"],
  },
  layers: [stackRef.getOutput("outputs").apply((f) => f.handler_extension)],
  timeout: 900,
  memorySize: 512,
  handler: "index.handler",
  packageType: "Zip",
  runtime: "nodejs20.x",
});

const reporting = new aws.lambda.Function(`reporting-${HANDLER_ID}`, {
  name: `reporting-${HANDLER_ID}`,
  role: "arn:aws:iam::730335604495:role/orchestrator-lambda",
  s3Bucket: "ingest-functions",
  s3Key: `reporting/${VERSION}.zip`,
  environment: {
    variables: {
      TRANSACTION_QUEUE_URL: transactionQueue.url,
      MANIFEST_BUCKET,
      MANIFEST_PREFIX,
      HANDLER_ID,
      VERSION,
    },
  },
  vpcConfig: {
    securityGroupIds: ["sg-08b95d721fc52088f"],
    subnetIds: ["subnet-0d588c105766713a1"],
  },
  timeout: 200,
  handler: "bootstrap",
  packageType: "Zip",
  runtime: "provided.al2023",
});

const handlerSourceMapping = new aws.lambda.EventSourceMapping(
  HANDLER_ID + "-source-mapping",
  {
    eventSourceArn: transactionQueue.arn,
    functionName: handler.arn,
  }
);

const snsOrchestratorPermission = new aws.lambda.Permission(
  `allow_sns_invoke_orchestrator_${HANDLER_ID}`,
  {
    statementId: `${HANDLER_ID}`,
    action: "lambda:InvokeFunction",
    principal: "sns.amazonaws.com",
    sourceArn: CHAIN_SNS,
    function: orchestrator.arn,
  }
);

const snsSub = new aws.sns.TopicSubscription(
  `orchestrator_${HANDLER_ID}_sns_sub`,
  {
    topic: CHAIN_SNS,
    protocol: "lambda",
    endpoint: orchestrator.arn,
  }
);

export const txQueueUrl = transactionQueue.url;
export const orchestratorArn = orchestrator.arn;
export const logFetcherArn = logFetcher.arn;
export const handlerArn = handler.arn;

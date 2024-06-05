import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import path = require("path");

const VERSION = process.env.VERSION!;
const org = "kayakthedev";

const stackRef = new pulumi.StackReference(`${org}/infra/${VERSION}`);

const HANDLER_ID = process.env.HANDLER_ID!;
const HANDLER_VERSION = process.env.HANDLER_VERSION!;
const MANIFEST_BUCKET = process.env.MANIFEST_BUCKET!;
const MANIFEST_PREFIX = process.env.MANIFEST_PREFIX!;
const POLLING_URL = process.env.POLLING_URL!;
const CHAIN_SNS = process.env.CHAIN_SNS!;
const DEPLOYMENT_ID = process.env.DEPLOYMENT_ID!;
const HANDLER_ENVS = process.env.HANDLER_ENVS!;
const STRIPE_CUSTOMER_ID = process.env.STRIPE_CUSTOMER_ID!;

const SYNCER_CLUSTER = "arn:aws:ecs:eu-west-1:730335604495:cluster/syncers";
const SYNCER_SUBNETS = ["subnet-05d39f2476de29dc7"];
const SYNCER_CONTAINER_NAME = "syncer";

const LOG_FETCHER_S3_BUCKET = "ingest-fetch-logs";

export = async () => {
  const transactionQueue = new aws.sqs.Queue(`tx-queue`, {
    visibilityTimeoutSeconds: 900,
    fifoQueue: true,
  });

  const logFetcher = new aws.lambda.Function(`log-fetcher`, {
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
        HANDLER_VERSION,
        VERSION,
        S3_BUCKET: LOG_FETCHER_S3_BUCKET,
      },
    },
    timeout: 200,
    handler: "bootstrap",
    packageType: "Zip",
    runtime: "provided.al2023",
  });

  const orchestrator = new aws.lambda.Function(`orchestrator`, {
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
        HANDLER_VERSION,
        VERSION,
        SYNCER_TASK_DEFINITION_ARN: await stackRef
          .getOutputValue("outputs")
          .then(JSON.parse)
          .then((r) => r.syncer_task_definition),
        SYNCER_CLUSTER,
        SYNCER_SUBNETS: SYNCER_SUBNETS.join(","),
        SYNCER_CONTAINER_NAME,
      },
    },
    timeout: 200,
    handler: "bootstrap",
    packageType: "Zip",
    runtime: "provided.al2023",
    reservedConcurrentExecutions: 1,
  });

  const handler = new aws.lambda.Function(`handler`, {
    role: "arn:aws:iam::730335604495:role/orchestrator-lambda",
    s3Bucket: "ingest-build-outputs",
    s3Key: path.join(
      "outputs",
      HANDLER_ID,
      HANDLER_VERSION,
      DEPLOYMENT_ID + ".zip"
    ),
    environment: {
      variables: {
        HANDLER_ID,
        HANDLER_VERSION,
        MUST_REMOVE_CONVECT_TBK:
          "REDACTED",
        USER_ENVS: HANDLER_ENVS,
        TRANSACTION_QUEUE_URL: transactionQueue.url,
        DATABASE_URL:
          "postgresql://postgres:REDACTED@example.cxy2caa825w6.eu-west-1.rds.amazonaws.com:5432/postgres?sslmode=require",
        STRIPE_CUSTOMER_ID,
      },
    },
    layers: [
      stackRef.getOutput("outputs").apply((f) => f.handler_extension_arn),
      stackRef.getOutput("outputs").apply((f) => f.http_extension_arn),
    ],
    timeout: 900,
    memorySize: 512,
    handler: "index.handler",
    packageType: "Zip",
    runtime: "nodejs20.x",
  });

  const handlerSourceMapping = new aws.lambda.EventSourceMapping(
    HANDLER_ID + "-source-mapping",
    {
      eventSourceArn: transactionQueue.arn,
      functionName: handler.arn,
    }
  );

  const snsOrchestratorPermission = new aws.lambda.Permission(
    `allow_sns_invoke_orchestrator`,
    {
      statementId: `${HANDLER_ID}`,
      action: "lambda:InvokeFunction",
      principal: "sns.amazonaws.com",
      sourceArn: CHAIN_SNS,
      function: orchestrator.arn,
    }
  );

  const snsSub = new aws.sns.TopicSubscription(`orchestrator_sns_sub`, {
    topic: CHAIN_SNS,
    protocol: "lambda",
    endpoint: orchestrator.arn,
  });

  return {
    txQueueUrl: transactionQueue.url,
    orchestratorArn: orchestrator.arn,
    logFetcherArn: logFetcher.arn,
    handlerArn: handler.arn,
  };
};

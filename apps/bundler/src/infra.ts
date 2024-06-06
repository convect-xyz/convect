import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import path from "path";
import { env } from "./env";

const org = "kayakthedev";

const stackRef = new pulumi.StackReference(`${org}/infra/${env.VERSION}`);

const SYNCER_CLUSTER = "arn:aws:ecs:eu-west-1:730335604495:cluster/syncers";
const SYNCER_SUBNETS = ["subnet-05d39f2476de29dc7"];
const SYNCER_CONTAINER_NAME = "syncer";

const LOG_FETCHER_S3_BUCKET = "ingest-fetch-logs";

export default async () => {
  const infraOuputs = await stackRef.getOutputValue("outputs");
  const syncerTaskDefinition = JSON.parse(infraOuputs).syncer_task_definition;

  const transactionQueue = new aws.sqs.Queue(`tx-queue`, {
    visibilityTimeoutSeconds: 900,
    fifoQueue: true,
  });

  const logFetcher = new aws.lambda.Function(`log-fetcher`, {
    role: "arn:aws:iam::730335604495:role/orchestrator-lambda",
    s3Bucket: "ingest-functions",
    s3Key: `log-fetcher/${env.VERSION}.zip`,
    environment: {
      variables: {
        TRANSACTION_QUEUE_URL: transactionQueue.url,
        MANIFEST_BUCKET: env.MANIFEST_BUCKET,
        MANIFEST_PREFIX: env.MANIFEST_PREFIX,
        NODE_ENDPOINT: env.POLLING_URL,
        HANDLER_ID: env.HANDLER_ID,
        HANDLER_VERSION: env.HANDLER_VERSION,
        VERSION: env.VERSION,
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
    s3Key: `orchestrator/${env.VERSION}.zip`,
    environment: {
      variables: {
        TRANSACTION_QUEUE_URL: transactionQueue.url,
        LOG_FETCHER_LAMBDA_ARN: logFetcher.arn,
        MANIFEST_BUCKET: env.MANIFEST_BUCKET,
        MANIFEST_PREFIX: env.MANIFEST_PREFIX,
        NODE_ENDPOINT: env.POLLING_URL,
        HANDLER_ID: env.HANDLER_ID,
        HANDLER_VERSION: env.HANDLER_VERSION,
        VERSION: env.VERSION,
        SYNCER_TASK_DEFINITION_ARN: syncerTaskDefinition,
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
      env.HANDLER_ID,
      env.HANDLER_VERSION,
      env.DEPLOYMENT_ID + ".zip"
    ),
    environment: {
      variables: {
        HANDLER_ID: env.HANDLER_ID,
        HANDLER_VERSION: env.HANDLER_VERSION,
        MUST_REMOVE_CONVECT_TBK:
          "p.eyJ1IjogIjJlYjlhNzU2LWFjMDMtNDJmOC1iNGY2LWI2M2RhN2JiMjkyNiIsICJpZCI6ICJjZTE2YmI1Yi04NDBiLTQwNGMtYjk4Yi0zMjJiNDc4ZDMyYWEiLCAiaG9zdCI6ICJhd3MtZXUtY2VudHJhbC0xIn0.1Bvj9OA-NZQ0cU62T1sweLScNLMPsv8FIGaP8nkHoRw",
        USER_ENVS: env.HANDLER_ENVS,
        TRANSACTION_QUEUE_URL: transactionQueue.url,
        DATABASE_URL:
          "postgresql://postgres:postgres@example.cxy2caa825w6.eu-west-1.rds.amazonaws.com:5432/postgres?sslmode=require",
        STRIPE_CUSTOMER_ID: env.STRIPE_CUSTOMER_ID,
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
    env.HANDLER_ID + "-source-mapping",
    {
      eventSourceArn: transactionQueue.arn,
      functionName: handler.arn,
    }
  );

  const snsOrchestratorPermission = new aws.lambda.Permission(
    `allow_sns_invoke_orchestrator`,
    {
      statementId: `${env.HANDLER_ID}`,
      action: "lambda:InvokeFunction",
      principal: "sns.amazonaws.com",
      sourceArn: env.CHAIN_SNS,
      function: orchestrator.arn,
    }
  );

  const snsSub = new aws.sns.TopicSubscription(`orchestrator_sns_sub`, {
    topic: env.CHAIN_SNS,
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

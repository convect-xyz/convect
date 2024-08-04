import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import path from "path";
import { env } from "./env";

const org = "kayakthedev";

const SYNCER_CLUSTER = "arn:aws:ecs:eu-west-1:730335604495:cluster/syncers";
const SYNCER_SUBNETS = ["subnet-05d39f2476de29dc7"];
const SYNCER_CONTAINER_NAME = "syncer";

export default async () => {
  const stackRef = new pulumi.StackReference(`${org}/infra/${env.VERSION}`);
  const githubSha = stackRef.getOutput("githubSha");

  const transactionQueue = new aws.sqs.Queue(`tx-queue`, {
    visibilityTimeoutSeconds: 900,
    fifoQueue: true,
  });

  const orchestrator = new aws.lambda.Function(`orchestrator`, {
    role: "arn:aws:iam::730335604495:role/orchestrator-lambda",
    s3Bucket: "ingest-functions",
    s3Key: pulumi.interpolate`orchestrator/${githubSha}.zip`,
    environment: {
      variables: {
        TRANSACTION_QUEUE_URL: transactionQueue.url,
        MANIFEST_BUCKET: env.MANIFEST_BUCKET,
        MANIFEST_PREFIX: env.MANIFEST_PREFIX,
        NODE_ENDPOINT: env.POLLING_URL,
        HANDLER_ID: env.HANDLER_ID,
        HANDLER_VERSION: env.HANDLER_VERSION,
        VERSION: env.VERSION,
        SYNCER_TASK_DEFINITION_ARN: stackRef.getOutput("syncerTaskDefinition"),
        SYNCER_CLUSTER,
        SYNCER_SUBNETS: SYNCER_SUBNETS.join(","),
        SYNCER_CONTAINER_NAME,
        GITHUB_SHA: githubSha,
        ETHERSCAN_LIKE: env.ETHERSCAN_LIKE,
        ETHERSCAN_API_KEY: env.ETHERSCAN_API_KEY,
        DEPLOYMENT_ID: env.DEPLOYMENT_ID,
        USER_ID: env.USER_ID,
      },
    },
    timeout: 200,
    handler: "bootstrap",
    packageType: "Zip",
    runtime: "provided.al2023",
    reservedConcurrentExecutions: 1,
  });

  new aws.lambda.FunctionEventInvokeConfig("orchestrator_config", {
    functionName: orchestrator.arn,
    maximumRetryAttempts: 0,
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
        CHAIN_ID: env.CHAIN_ID.toString(),
        USER_ENVS: env.HANDLER_ENVS,
        TRANSACTION_QUEUE_URL: transactionQueue.url,
        STRIPE_CUSTOMER_ID: env.STRIPE_CUSTOMER_ID,
        USER_ID: env.USER_ID,
        REPORTING_QUEUE_URL: stackRef.getOutput("reportingQueueUrl"),
        DEPLOYMENT_ID: env.DEPLOYMENT_ID,
      },
    },
    layers: [
      stackRef.getOutput("handlerExtensionArn"),
      stackRef.getOutput("handlerServerArn"),
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
    handlerArn: handler.arn,
  };
};

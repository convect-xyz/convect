import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import path from "path";
import { env } from "./env";

const org = "kayakthedev";

const SYNCER_CLUSTER = "arn:aws:ecs:eu-west-1:730335604495:cluster/syncers";
const SYNCER_SUBNETS = ["subnet-05d39f2476de29dc7"];
const SYNCER_CONTAINER_NAME = "syncer";
const ALL_CHAINS_SNS_TOPIC = "arn:aws:sns:eu-west-1:730335604495:all-chains";

export default async () => {
  const stackRef = new pulumi.StackReference(`${org}/infra/${env.VERSION}`);
  const githubSha = stackRef.getOutput("githubSha");

  const txQueueUrls: Array<pulumi.Output<string>> = [];

  for (const chain of env.CHAINS) {
    const queue = new aws.sqs.Queue(`tx-queue-${chain.chainId}`, {
      visibilityTimeoutSeconds: 900,
      fifoQueue: true,
    });

    txQueueUrls.push(queue.url);

    const handler = new aws.lambda.Function(`handler-${chain.chainId}`, {
      role: "arn:aws:iam::730335604495:role/orchestrator-lambda",
      s3Bucket: "ingest-build-outputs",
      s3Key: path.join("outputs", env.FUNCTION_ID, env.DEPLOYMENT_ID + ".zip"),
      environment: {
        variables: {
          CHAINS: JSON.stringify(env.CHAINS),
          USER_ENVS: env.FUNCTION_ENVS,
          TRANSACTION_QUEUE_URL: queue.url,
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

    new aws.lambda.EventSourceMapping(
      env.FUNCTION_ID + chain.chainId.toString() + "-source-mapping",
      {
        eventSourceArn: queue.arn,
        functionName: handler.arn,
      }
    );
  }

  const txQueueUrlOutputs = pulumi.all(txQueueUrls);

  const orchestrator = new aws.lambda.Function(`orchestrator`, {
    role: "arn:aws:iam::730335604495:role/orchestrator-lambda",
    s3Bucket: "ingest-functions",
    s3Key: pulumi.interpolate`orchestrator/${githubSha}.zip`,
    environment: {
      variables: {
        MANIFEST_BUCKET: env.MANIFEST_BUCKET,
        MANIFEST_PREFIX: env.MANIFEST_PREFIX,
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
        CHAINS: JSON.stringify(
          env.CHAINS.map((c, idx) => ({
            ...c,
            txQueueUrl: txQueueUrlOutputs.apply((v) => v[idx]),
          }))
        ),
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

  const snsOrchestratorPermission = new aws.lambda.Permission(
    `allow_sns_invoke_orchestrator`,
    {
      statementId: `${env.FUNCTION_ID}`,
      action: "lambda:InvokeFunction",
      principal: "sns.amazonaws.com",
      sourceArn: ALL_CHAINS_SNS_TOPIC,
      function: orchestrator.arn,
    }
  );

  const snsSub = new aws.sns.TopicSubscription(`orchestrator_sns_sub`, {
    topic: ALL_CHAINS_SNS_TOPIC,
    protocol: "lambda",
    endpoint: orchestrator.arn,
  });

  return {
    txQueueUrls: txQueueUrlOutputs,
    orchestratorArn: orchestrator.arn,
  };
};

import { parseManifest } from "@convect-xyz/lib";
import { decryptEnvValue } from "@convect-xyz/server";
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import path from "path";
import { env } from "./env";
import { getCurrentDeployment } from "./task";

const org = "kayakthedev";

const SYNCER_CLUSTER = "arn:aws:ecs:eu-west-1:730335604495:cluster/syncers";
const SYNCER_SUBNETS = ["subnet-05d39f2476de29dc7"];
const SYNCER_CONTAINER_NAME = "syncer";
const ALL_CHAINS_SNS_TOPIC = "arn:aws:sns:eu-west-1:730335604495:all-chains";

export default async () => {
  const currentDeployment = await getCurrentDeployment();

  const stackRef = new pulumi.StackReference(
    `${org}/infra/${currentDeployment.version}`
  );
  const githubSha = stackRef.getOutput("githubSha");

  const txQueueUrls: Array<pulumi.Output<string>> = [];
  const manifest = parseManifest(currentDeployment.manifest);

  for (const chain of manifest.chains) {
    const queue = new aws.sqs.Queue(
      `tx-queue-${chain.chainId}-${currentDeployment.id}`,
      {
        visibilityTimeoutSeconds: 900,
        fifoQueue: true,
      }
    );

    txQueueUrls.push(queue.url);

    const chainConfig = manifest.chains.find(
      (c) => c.chainId === chain.chainId
    )!;

    const handler = new aws.lambda.Function(`handler-${chain.chainId}`, {
      role: "arn:aws:iam::730335604495:role/orchestrator-lambda",
      s3Bucket: "ingest-build-outputs",
      s3Key: path.join(
        "outputs",
        currentDeployment.functionId.toString(),
        currentDeployment.id + ".zip"
      ),
      environment: {
        variables: {
          CHAIN_ID: chainConfig.chainId.toString(),
          USER_ENVS: JSON.stringify(
            currentDeployment.function.envs.map((functionEnv) => ({
              key: functionEnv.key,
              value: decryptEnvValue(
                env.ENV_DECRYPTION_KEY,
                functionEnv.value,
                functionEnv.iv
              ),
            }))
          ),
          TRANSACTION_QUEUE_URL: queue.url,
          PROJECT_ID: currentDeployment.function.projectId.toString(),
          REPORTING_QUEUE_URL: stackRef.getOutput("reportingQueueUrl"),
          DEPLOYMENT_ID: currentDeployment.id,
          FUNCTION_ID: currentDeployment.functionId.toString(),
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
      currentDeployment.functionId.toString() +
        chain.chainId.toString() +
        "-source-mapping",
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
        MANIFEST_BUCKET: currentDeployment.manifestBucket,
        MANIFEST_PREFIX: currentDeployment.manifestKey,
        VERSION: currentDeployment.version,
        SYNCER_TASK_DEFINITION_ARN: stackRef.getOutput("syncerTaskDefinition"),
        SYNCER_CLUSTER,
        SYNCER_SUBNETS: SYNCER_SUBNETS.join(","),
        SYNCER_CONTAINER_NAME,
        GITHUB_SHA: githubSha,
        FUNCTION_ID: currentDeployment.functionId.toString(),
        DEPLOYMENT_ID: currentDeployment.id,
        PROJECT_ID: currentDeployment.function.projectId.toString(),
        CHAINS: txQueueUrlOutputs.apply((output) =>
          JSON.stringify(
            output.map((url, idx) => {
              const manifestChain = manifest.chains[idx];
              return {
                chainId: manifestChain.chainId,
                txQueueUrl: url,
              };
            })
          )
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

  new aws.lambda.Permission(`allow_sns_invoke_orchestrator`, {
    statementId: `${currentDeployment.functionId.toString()}`,
    action: "lambda:InvokeFunction",
    principal: "sns.amazonaws.com",
    sourceArn: ALL_CHAINS_SNS_TOPIC,
    function: orchestrator.arn,
  });

  new aws.sns.TopicSubscription(`orchestrator_sns_sub`, {
    topic: ALL_CHAINS_SNS_TOPIC,
    protocol: "lambda",
    endpoint: orchestrator.arn,
  });

  return {
    txQueueUrls: txQueueUrlOutputs,
    orchestratorArn: orchestrator.arn,
  };
};

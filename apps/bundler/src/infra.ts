import { parseManifest } from "@convect-xyz/lib";
import { decryptEnvValue, getCodeBucket } from "@convect-xyz/server";
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import path from "path";
import { env } from "./env";
import { DeploymentManager } from "./manager";

const org = "kayakthedev";

const SYNCER_CLUSTER = "arn:aws:ecs:eu-west-1:730335604495:cluster/syncers";
const SYNCER_SUBNETS = ["subnet-05d39f2476de29dc7"];
const SYNCER_CONTAINER_NAME = "syncer";
const ALL_CHAINS_SNS_TOPIC = "arn:aws:sns:eu-west-1:730335604495:all-chains";

export default async () => {
  const current = await DeploymentManager.getOrCreate().then((r) => r.current);
  if (!current) throw new Error("No current deployment.");

  const stackRef = new pulumi.StackReference(
    `${org}/infra/${current.deployment.version}`
  );
  const githubSha = stackRef.getOutput("githubSha");

  const txQueueUrls: Array<pulumi.Output<string>> = [];
  const manifest = parseManifest(current.deployment.manifest);

  const reportingQueue = new aws.sqs.Queue(
    `reporting-queue-${current.deployment.id}`,
    {
      visibilityTimeoutSeconds: 300,
    },
    {
      deleteBeforeReplace: false,
    }
  );

  const reportingHandler = new aws.lambda.Function(
    `reporting-handler-${current.deployment.id}`,
    {
      role: "arn:aws:iam::730335604495:role/orchestrator-lambda",
      s3Bucket: "ingest-functions",
      s3Key: pulumi.interpolate`reporting/${githubSha}.zip`,
      timeout: 300,
      memorySize: 512,
      handler: "bootstrap",
      packageType: "Zip",
      runtime: "provided.al2023",
      environment: {
        variables: {
          STRIPE_CUSTOMER_ID:
            current.deployment.function.project.stripeCustomerId!,
        },
      },
    }
  );

  new aws.lambda.EventSourceMapping(
    `reporing-handler-source-mapping-${current.deployment.id}`,
    {
      eventSourceArn: reportingQueue.arn,
      functionName: reportingHandler.arn,
    }
  );

  for (const chain of manifest.chains) {
    const queue = new aws.sqs.Queue(
      `tx-queue-${chain.chainId}-${current.deployment.id}`,
      {
        visibilityTimeoutSeconds: 900,
        fifoQueue: true,
      }
    );

    txQueueUrls.push(queue.url);

    const manifestChain = manifest.chains.find(
      (c) => c.chainId === chain.chainId
    )!;

    const handler = new aws.lambda.Function(
      `handler-${chain.chainId}-${current.deployment.id}`,
      {
        role: getRoleForHandler().arn,
        s3Bucket: getCodeBucket(),
        s3Key: path.join(
          "outputs",
          current.deployment.functionId.toString(),
          current.deployment.id + ".zip"
        ),
        environment: {
          variables: {
            CHAIN_ID: manifestChain.chainId.toString(),
            USER_ENVS: JSON.stringify(
              current.deployment.function.envs.map((functionEnv) => ({
                key: functionEnv.key,
                value: decryptEnvValue(
                  env.ENV_DECRYPTION_KEY,
                  functionEnv.value,
                  functionEnv.iv
                ),
              }))
            ),
            TRANSACTION_QUEUE_URL: queue.url,
            PROJECT_ID: current.deployment.function.projectId.toString(),
            REPORTING_QUEUE_URL: reportingQueue.url,
            DEPLOYMENT_ID: current.deployment.id,
            FUNCTION_ID: current.deployment.functionId.toString(),
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
      }
    );

    new aws.lambda.EventSourceMapping(
      current.deployment.functionId.toString() +
        chain.chainId.toString() +
        "-source-mapping",
      {
        eventSourceArn: queue.arn,
        functionName: handler.arn,
        functionResponseTypes: ["ReportBatchItemFailures"],
      }
    );
  }

  const txQueueUrlOutputs = pulumi.all(txQueueUrls);

  const orchestrator = new aws.lambda.Function(
    `orchestrator-${current.deployment.id}`,
    {
      role: "arn:aws:iam::730335604495:role/orchestrator-lambda",
      s3Bucket: "ingest-functions",
      s3Key: pulumi.interpolate`orchestrator/${githubSha}.zip`,
      environment: {
        variables: {
          MANIFEST_BUCKET: current.deployment.manifestBucket,
          MANIFEST_PREFIX: current.deployment.manifestKey,
          VERSION: current.deployment.version,
          SYNCER_TASK_DEFINITION_ARN: stackRef.getOutput(
            "syncerTaskDefinition"
          ),
          SYNCER_CLUSTER,
          SYNCER_SUBNETS: SYNCER_SUBNETS.join(","),
          SYNCER_CONTAINER_NAME,
          GITHUB_SHA: githubSha,
          FUNCTION_ID: current.deployment.functionId.toString(),
          DEPLOYMENT_ID: current.deployment.id,
          PROJECT_ID: current.deployment.function.projectId.toString(),
          STRIPE_CUSTOMER_ID:
            current.deployment.function.project.stripeCustomerId!,
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
    }
  );

  new aws.lambda.FunctionEventInvokeConfig("orchestrator_config", {
    functionName: orchestrator.arn,
    maximumRetryAttempts: 0,
  });

  new aws.lambda.Permission(`allow_sns_invoke_orchestrator`, {
    statementId: `${current.deployment.functionId.toString()}`,
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

function getRoleForHandler() {
  // Define the IAM policy with the necessary permissions
  const sqsPolicy = new aws.iam.Policy("sqsPolicy", {
    description: "IAM policy for Lambda function to access SQS",
    policy: JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: [
            "sqs:SendMessage",
            "sqs:ReceiveMessage",
            "sqs:DeleteMessage",
            "sqs:GetQueueAttributes",
            "sqs:GetQueueUrl",
          ],
          Resource: "*",
        },
      ],
    }),
  });

  // Create the IAM role for the Lambda function
  const lambdaRole = new aws.iam.Role("lambdaRole", {
    assumeRolePolicy: JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: {
            Service: "lambda.amazonaws.com",
          },
          Action: "sts:AssumeRole",
        },
      ],
    }),
  });

  // Attach the policy to the role
  new aws.iam.RolePolicyAttachment("lambdaRolePolicyAttachment", {
    role: lambdaRole.name,
    policyArn: sqsPolicy.arn,
  });

  return lambdaRole;
}

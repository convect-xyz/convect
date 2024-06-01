import { RunTaskCommand } from "@aws-sdk/client-ecs";
import { env } from "~/env";
import { ecs } from "~/lib/server/aws";

type TriggerBuildOptions = {
  version: string;
  deploymentId: string;
  stripeCustomerId: string;
  internalHandlerId: string;
  previousInternalHandlerId?: string;
  pollingUrl: string;
  chainSns: string;
  envs: Array<{ key: string; value: string }>;
  mode: "init" | "update";
  sourcePrefix: string;
};

export async function createDeployment(options: TriggerBuildOptions) {
  const command = new RunTaskCommand({
    cluster: "arn:aws:ecs:eu-west-1:730335604495:cluster/build",
    taskDefinition: `arn:aws:ecs:eu-west-1:730335604495:task-definition/${options.version
      .replaceAll(".", "-")
      .replaceAll("/", "-")}_builder`,
    networkConfiguration: {
      awsvpcConfiguration: {
        subnets: ["subnet-05d39f2476de29dc7"],
        assignPublicIp: "ENABLED",
      },
    },
    launchType: "FARGATE",
    overrides: {
      containerOverrides: [
        {
          name: "builder",
          environment: [
            { name: "VERSION", value: options.version },
            { name: "MODE", value: options.mode },
            {
              name: "PREVIOUS_HANDLER_ID",
              value: options.previousInternalHandlerId?.toString() ?? "",
            },
            {
              name: "HANDLER_ID",
              value: options.internalHandlerId.toString(),
            },
            {
              name: "SOURCE_BUCKET",
              value: "ingest-build-outputs",
            },
            {
              name: "SOURCE_PREFIX",
              value: options.sourcePrefix,
            },
            {
              name: "POLLING_URL",
              value: options.pollingUrl,
            },
            {
              name: "CHAIN_SNS",
              value: options.chainSns,
            },
            {
              name: "DATABASE_URL",
              value: env.DATABASE_URL,
            },
            {
              name: "DEPLOYMENT_ID",
              value: options.deploymentId,
            },
            {
              name: "STRIPE_CUSTOMER_ID",
              value: options.stripeCustomerId,
            },
            {
              name: "HANDLER_ENVS",
              value: JSON.stringify(options.envs),
            },
          ],
        },
      ],
    },
  });

  const output = await ecs.send(command);

  const task = output.tasks?.at(0);
  if (!task || !task.taskArn) {
    throw new Error("Task did not start");
  }

  // await db.insert(schema.deployment).values({
  //   handlerId: options.internalHandlerId,
  //   ecsTaskId: task.taskArn,
  // });

  return {
    ecsOutput: output,
  };
}

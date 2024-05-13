import { RunTaskCommand } from "@aws-sdk/client-ecs";
import { env } from "~/env";
import { ecs } from "~/lib/server/aws";
import { db } from "~/server/db";
import schema from "~/server/db/schema";

type TriggerBuildOptions = {
  version: string;
  deploymentId: string;
  projectId: number;
  handlerId: number;
  pollingUrl: string;
  chainSns: string;
  envs: Array<{ key: string; value: string }>;
  mode: "new" | "update";
};

export async function createDeployment(options: TriggerBuildOptions) {
  const command = new RunTaskCommand({
    cluster: "arn:aws:ecs:eu-west-1:730335604495:cluster/build",
    taskDefinition:
      `arn:aws:ecs:eu-west-1:730335604495:task-definition/builder-${options.version.replaceAll(".", "-")}:1`,
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
              name: "PROJECT_ID",
              value: options.projectId.toString(),
            },
            {
              name: "HANDLER_ID",
              value: options.handlerId.toString(),
            },
            {
              name: "SOURCE_BUCKET",
              value: "ingest-build-outputs",
            },
            {
              name: "SOURCE_PREFIX",
              value: `code/${options.projectId}/${options.handlerId}`,
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

  await db.insert(schema.deployment).values({
    handlerId: options.handlerId,
    ecsTaskId: task.taskArn,
  });

  return {
    ecsOutput: output,
  };
}

import { RunTaskCommand } from "@aws-sdk/client-ecs";
import { eq } from "drizzle-orm";
import { env } from "~/env";
import { ecs } from "~/lib/server/aws";
import { db } from "~/server/db";
import schema from "~/server/db/schema";
import { getStackOutputs } from "../pulumi/getStackOutputs";

type TriggerBuildOptions = {
  version: string;
  deploymentId: string;
  stripeCustomerId: string;
  userId: string;
  handlerId: number;
  internalHandlerId: string;
  internalHandlerVersion: number;
  manifestBucket: string;
  manifestPrefix: string;
  envs: Array<{ key: string; value: string }>;
  chainConfigs: Array<{ chainId: number; pollingUrl: string }>;
  mode: "init" | "update";
  sourcePrefix: string;
  etherscanApiKey: string;
  etherscanLike: string;
};

export async function createDeployment(options: TriggerBuildOptions) {
  const outputs = await getStackOutputs();

  await db.insert(schema.deployment).values({
    id: options.deploymentId,
    handlerId: options.handlerId,
    ecsTaskId: "",
    status: "PENDING",
  });

  const command = new RunTaskCommand({
    cluster: "arn:aws:ecs:eu-west-1:730335604495:cluster/build",
    taskDefinition: outputs.builderTaskDefinition,
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
              name: "HANDLER_VERSION",
              value: options.internalHandlerVersion.toString(),
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
              name: "MANIFEST_BUCKET",
              value: options.manifestBucket,
            },
            {
              name: "MANIFEST_PREFIX",
              value: options.manifestPrefix,
            },
            {
              name: "CHAINS",
              value: JSON.stringify(options.chainConfigs),
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
              name: "USER_ID",
              value: options.userId,
            },
            {
              name: "HANDLER_ENVS",
              value: JSON.stringify(options.envs),
            },
            {
              name: "ETHERSCAN_API_KEY",
              value: options.etherscanApiKey,
            },
            {
              name: "ETHERSCAN_LIKE",
              value: options.etherscanLike,
            },
          ],
        },
      ],
    },
  });

  const output = await ecs.send(command);

  const task = output.tasks?.at(0);
  if (!task || !task.taskArn) {
    await db
      .delete(schema.deployment)
      .where(eq(schema.deployment.id, options.deploymentId));

    throw new Error("Task did not start");
  }

  await db.update(schema.deployment).set({
    ecsTaskId: task.taskArn,
  });

  return {
    ecsOutput: "",
  };
}

type DestroyDeploymentOptions = {
  internalHandlerId: string;
  internalHandlerVersion: number;
  version: string;
};

export async function destroyDeployment(options: DestroyDeploymentOptions) {
  const outputs = await getStackOutputs();

  const command = new RunTaskCommand({
    cluster: "arn:aws:ecs:eu-west-1:730335604495:cluster/build",
    taskDefinition: outputs.builderTaskDefinition,
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
            { name: "MODE", value: "destroy" },
            {
              name: "HANDLER_VERSION",
              value: options.internalHandlerVersion.toString(),
            },
            {
              name: "HANDLER_ID",
              value: options.internalHandlerId.toString(),
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

  return {
    ecsOutput: output,
  };
}

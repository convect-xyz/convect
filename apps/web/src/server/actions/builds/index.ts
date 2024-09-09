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
  projectId: number;
  functionId: number;
  functionGlobalId: string;
  manifestBucket: string;
  manifestPrefix: string;
  rawManifest: string;
  envs: Array<{ key: string; value: string }>;
  chainConfigs: Array<{
    chainId: number;
    pollingUrl: string;
    etherscanApiKey: string;
    etherscanLike: string;
  }>;
  mode: "init" | "update";
  sourcePrefix: string;
};

export async function createDeployment(options: TriggerBuildOptions) {
  const outputs = await getStackOutputs();
  console.log(outputs);
  const hasPendingOrRunning = await db.transaction(async (tx) => {
    const hasPendingOrRunning = await tx.query.deployment.findFirst({
      where(fields, { eq, and, or }) {
        return and(
          eq(fields.functionId, options.functionId),
          or(eq(fields.status, "PENDING"), eq(fields.status, "RUNNING")),
        );
      },
    });

    await db.insert(schema.deployment).values({
      id: options.deploymentId,
      functionId: options.functionId,
      ecsTaskId: "",
      status: "PENDING",
      manifest: options.rawManifest,
      manifestBucket: options.manifestBucket,
      manifestKey: options.manifestPrefix,
      mode: options.mode,
      sourceKey: options.sourcePrefix,
      sourceBucket: "ingest-build-outputs",
      version: options.version,
    });

    return !!hasPendingOrRunning;
  });

  if (hasPendingOrRunning) {
    return;
  }

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
            { name: "ENV_DECRYPTION_KEY", value: env.ENCRYPTION_KEY },
            {
              name: "DATABASE_URL",
              value: env.DATABASE_URL,
            },
            {
              name: "INITIAL_DEPLOYMENT_ID",
              value: options.deploymentId,
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
  functionId: number;
  functionGlobalId: string;
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
              name: "FUNCTION_ID",
              value: options.functionId.toString(),
            },
            {
              name: "FUNCTION_GLOBAL_ID",
              value: options.functionGlobalId,
            },
            {
              name: "DATABASE_URL",
              value: env.DATABASE_URL,
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

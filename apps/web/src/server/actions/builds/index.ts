import { RunTaskCommand } from "@aws-sdk/client-ecs";
import { env } from "~/env";
import { ecs } from "~/lib/server/aws";
import { getStackOutputs } from "../pulumi/getStackOutputs";

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

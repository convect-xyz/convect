import { RunTaskCommand } from "@aws-sdk/client-ecs";
import { ecs } from "~/lib/server/aws";

type TriggerBuildOptions = {
  deploymentId: string;
  githubAccessToken: string;
  githubUsername: string;
  githubRepo: string;
  githubBranch: string;
};

export async function triggerBuild(options: TriggerBuildOptions) {
  const command = new RunTaskCommand({
    cluster: "arn:aws:ecs:eu-west-1:730335604495:cluster/build",
    taskDefinition:
      "arn:aws:ecs:eu-west-1:730335604495:task-definition/builder:3",
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
            {
              name: "DEPLOYMENT_ID",
              value: options.deploymentId,
            },
            {
              name: "GITHUB_ACCESS_TOKEN",
              value: options.githubAccessToken,
            },
            {
              name: "GITHUB_REF",
              value: options.githubBranch,
            },
            {
              name: "GITHUB_OWNER",
              value: options.githubUsername,
            },
            {
              name: "GITHUB_REPO",
              value: options.githubRepo,
            },
            {
              name: "SRC_DIR",
              value: "/build/src",
            },
            {
              name: "OUT_DIR",
              value: "/build/out",
            },
            {
              name: "ARCHIVE_DIR",
              value: "/build/archive",
            },
            {
              name: "INGEST_API",
              value: "https://relieved-allegedly-turkey.ngrok-free.app",
            },
          ],
        },
      ],
    },
  });

  return {
    ecsOutput: await ecs.send(command),
  };
}

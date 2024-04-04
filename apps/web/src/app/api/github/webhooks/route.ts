import { RunTaskCommand } from "@aws-sdk/client-ecs";
import { Webhooks } from "@octokit/webhooks";
import { NextRequest, NextResponse } from "next/server";
import { v4 } from "uuid";
import { ecs } from "~/lib/server/aws";
import { db } from "~/server/db";
import { deployments } from "~/server/db/schema";

const webhooks = new Webhooks({
  secret: "123",
});

type StartBuildOptions = {
  deploymentId: string;
  accessToken: string;
  owner: string;
  repo: string;
  ref: string;
};

async function startBuild(options: StartBuildOptions) {
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
              value: options.accessToken,
            },
            {
              name: "GITHUB_REF",
              value: options.ref,
            },
            {
              name: "GITHUB_OWNER",
              value: options.owner,
            },
            {
              name: "GITHUB_REPO",
              value: options.repo,
            },
            {
              name: "SRC_DIR",
              value: "/build/src",
            },
            {
              name: "ARCHIVE_DIR",
              value: "/build/archive",
            },
          ],
        },
      ],
    },
  });

  await ecs.send(command);
}

export const POST = async (req: NextRequest) => {
  const event = await req.json();

  webhooks.verifyAndReceive({
    id: req.headers.get("x-request-id")!,
    name: req.headers.get("x-github-event")! as any,
    signature: req.headers.get("x-hub-signature")!,
    payload: JSON.stringify(event),
  });

  webhooks.on("push", async (data) => {
    const project = await db.query.projects.findFirst({
      where(projects, { eq }) {
        return eq(projects.repository, data.payload.repository.name);
      },
      with: {
        user: {
          with: {
            accounts: true,
          },
        },
      },
    });

    const deployment = await db
      .insert(deployments)
      .values({
        id: v4(),
        projectId: project!.id,
      })
      .returning({ id: deployments.id })
      .then((d) => d[0]!);

    const account = project!.user.accounts.find(
      (a) => a.provider === "github",
    )!;

    await startBuild({
      deploymentId: deployment.id,
      accessToken: "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",
      owner: "kayakthedev",
      repo: "example-1",
      ref: "main",
    });
  });

  return NextResponse.json({});
};

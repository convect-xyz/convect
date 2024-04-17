import { Webhooks } from "@octokit/webhooks";
import { NextRequest, NextResponse } from "next/server";
import { v4 } from "uuid";
import { triggerBuild } from "~/server/actions/builds";
import { db } from "~/server/db";
import { deployments } from "~/server/db/schema";

const webhooks = new Webhooks({
  secret: "123",
});

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
        return eq(projects.repositoryId, data.payload.repository.id);
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
        branch: "main",
      })
      .returning({ id: deployments.id })
      .then((d) => d[0]!);

    const account = project!.user.accounts.find(
      (a) => a.provider === "github",
    )!;

    await triggerBuild({
      deploymentId: deployment.id,
      githubAccessToken: "REDACTED",
      githubUsername: "kayakthedev",
      githubRepo: "example-1",
      githubBranch: "main",
    });
  });

  return NextResponse.json({});
};

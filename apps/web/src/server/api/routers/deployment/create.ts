import { TRPCError } from "@trpc/server";
import { v4 } from "uuid";
import { z } from "zod";
import { triggerBuild } from "~/server/actions/builds";
import { protectedProcedure } from "~/server/api/trpc";
import { deployments } from "~/server/db/schema";
import { octokitMiddleware } from "../../middleware";

export const createDeploymentApi = protectedProcedure
  .input(
    z.object({
      projectId: z.string(),
      branch: z.string(),
    }),
  )
  .output(z.object({}))
  .use(octokitMiddleware)
  .mutation(async ({ ctx, input }) => {
    const project = await ctx.db.query.projects.findFirst({
      where: (fields, { eq, and }) =>
        and(
          eq(fields.id, input.projectId),
          eq(fields.userId, ctx.session.user.id),
        ),
    });

    if (!project) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
    }

    const newDeployment = await ctx.db
      .insert(deployments)
      .values({
        id: v4(),
        branch: input.branch,
        projectId: project.id,
      })
      .returning()
      .then((d) => d.at(0)!);

    const repository = await ctx.octokit.request("GET /repositories/{id}/", {
      id: project.repositoryId,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    const { ecsOutput } = await triggerBuild({
      deploymentId: newDeployment.id,
      githubAccessToken: "REDACTED",
      githubUsername: repository.data.owner.login,
      githubRepo: repository.data.name,
      githubBranch: newDeployment.branch,
    });

    return {};
  });

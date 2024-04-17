import { v4 } from "uuid";
import { z } from "zod";
import { env } from "~/env";
import { protectedProcedure } from "~/server/api/trpc";
import { projects } from "~/server/db/schema";
import { octokitMiddleware } from "../../middleware";

export const createProject = protectedProcedure
  .input(z.object({ repositoryId: z.number() }))
  .output(
    z.object({
      id: z.string(),
    }),
  )
  .use(octokitMiddleware)
  .mutation(async ({ ctx, input }) => {
    const repository = await ctx.octokit.request("GET /repositories/{id}/", {
      id: input.repositoryId,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    await ctx.octokit.request("POST /repos/{owner}/{repo}/hooks", {
      owner: repository.data.owner.login,
      repo: repository.data.name,
      active: true,
      events: ["push"],
      config: {
        url: env.REPOSITORY_WEBHOOK_RECEIVER_URL,
        content_type: "json",
        insecure_ssl: "0",
        secret: "123",
      },
      headers: {
        "X-Github-Api-Version": "2022-11-28",
      },
    });

    const project = await ctx.db
      .insert(projects)
      .values({
        id: v4(),
        name: repository.data.name,
        repositoryId: input.repositoryId,
        userId: ctx.session.user.id,
      })
      .returning({ id: projects.id });

    return {
      id: project[0]!.id,
    };
  });

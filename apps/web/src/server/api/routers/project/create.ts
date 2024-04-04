import { Octokit } from "octokit";
import { v4 } from "uuid";
import { z } from "zod";
import { env } from "~/env";
import { protectedProcedure } from "~/server/api/trpc";
import { projects } from "~/server/db/schema";

export const createProject = protectedProcedure
  .input(z.object({ repoName: z.string() }))
  .output(
    z.object({
      id: z.string(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const account = await ctx.db.query.accounts.findFirst({
      where: (accounts, { eq }) => eq(accounts.userId, ctx.session.user.id),
    });
    if (!account) {
      throw new Error("account not found");
    }

    const octokit = new Octokit({
      auth: account.access_token,
    });

    const owner = ctx.session.user.name!;
    const repo = input.repoName;

    const repository = await octokit.request("GET /repos/{owner}/{repo}", {
      owner,
      repo,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    await octokit.request("POST /repos/{owner}/{repo}/hooks", {
      owner,
      repo,
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
        repository: repository.data.name,
        userId: ctx.session.user.id,
      })
      .returning({ id: projects.id });

    return {
      id: project[0]!.id,
    };
  });

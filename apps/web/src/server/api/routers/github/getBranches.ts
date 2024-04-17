import { z } from "zod";
import { protectedProcedure } from "~/server/api/trpc";
import { octokitMiddleware } from "../../middleware";

export const getBranches = protectedProcedure
  .input(
    z.object({
      repositoryId: z.number(),
      page: z.number().optional(),
    }),
  )
  .output(
    z.array(
      z.object({
        name: z.string(),
      }),
    ),
  )
  .use(octokitMiddleware)
  .query(async ({ ctx, input }) => {
    const repository = await ctx.octokit.request("GET /repositories/{id}/", {
      id: input.repositoryId,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    const branches = await ctx.octokit.request(
      "GET /repos/{owner}/{repo}/branches",
      {
        owner: repository.data.owner.login,
        repo: repository.data.name,
        per_page: 100,
        page: input.page ?? 1,
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );

    return branches.data.map((branch) => ({
      name: branch.name,
    }));
  });

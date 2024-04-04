import { Octokit } from "octokit";
import { z } from "zod";
import { protectedProcedure } from "~/server/api/trpc";

export const getRepositories = protectedProcedure
  .input(
    z.object({
      installationId: z.number(),
    }),
  )
  .output(
    z.array(
      z.object({
        id: z.number(),
        name: z.string(),
      }),
    ),
  )
  .query(async ({ ctx, input }) => {
    const account = await ctx.db.query.accounts.findFirst({
      where: (accounts, { eq }) => eq(accounts.userId, ctx.session.user.id),
    });
    if (!account) {
      throw new Error("account not found");
    }

    const octokit = new Octokit({
      auth: account.access_token,
    });

    return octokit
      .request("GET /user/installations/{installation_id}/repositories", {
        installation_id: input.installationId,
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      })
      .then((response) =>
        response.data.repositories.map((repo) => ({
          id: repo.id,
          name: repo.name,
        })),
      );
  });

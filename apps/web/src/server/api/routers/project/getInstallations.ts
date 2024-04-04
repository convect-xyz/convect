import { Octokit } from "octokit";
import { z } from "zod";
import { protectedProcedure } from "~/server/api/trpc";

export const getInstallations = protectedProcedure
  .output(
    z.array(
      z.object({
        id: z.number(),
        name: z.string(),
        profileUrl: z.string(),
      }),
    ),
  )
  .query(async ({ ctx }) => {
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
      .request("GET /user/installations", {
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      })
      .then((r) =>
        r.data.installations.map((installation) => ({
          id: installation.id,
          name: (installation.account as any).login ?? "Unknown Account",
          profileUrl:
            installation.account?.avatar_url ??
            "https://github.com/images/error/octocat_happy.gif",
        })),
      );
  });

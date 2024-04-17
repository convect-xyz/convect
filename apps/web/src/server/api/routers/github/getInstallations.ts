import { z } from "zod";
import { protectedProcedure } from "~/server/api/trpc";
import { octokitMiddleware } from "../../middleware";

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
  .use(octokitMiddleware)
  .query(async ({ ctx }) => {
    return ctx.octokit
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

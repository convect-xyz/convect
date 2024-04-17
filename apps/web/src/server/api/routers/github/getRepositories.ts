import { z } from "zod";
import { protectedProcedure } from "~/server/api/trpc";
import { octokitMiddleware } from "../../middleware";

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
  .use(octokitMiddleware)
  .query(async ({ ctx, input }) => {
    return ctx.octokit
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

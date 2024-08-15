import { z } from "zod";
import { protectedProcedure } from "~/trpc/trpc";

export const getApiKeys = protectedProcedure
  .output(
    z.array(
      z.object({
        id: z.number(),
        name: z.string(),
        token: z.string(),
      }),
    ),
  )
  .query(async ({ ctx, input }) => {
    const apiKeys = ctx.db.query.apiKey.findMany({
      where(fields, { eq }) {
        return eq(fields.userId, ctx.session.user.id);
      },
    });

    return apiKeys;
  });

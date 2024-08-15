import { and, eq } from "drizzle-orm";
import { z } from "zod";
import schema from "~/server/db/schema";
import { protectedProcedure } from "~/trpc/trpc";

export const deleteApiKey = protectedProcedure
  .input(
    z.object({
      apiKeyId: z.number(),
    }),
  )
  .output(z.object({}))
  .mutation(async ({ ctx, input }) => {
    const apiKey = await ctx.db
      .delete(schema.apiKey)
      .where(
        and(
          eq(schema.apiKey.id, input.apiKeyId),
          eq(schema.apiKey.userId, ctx.session.user.id),
        ),
      );

    return {};
  });

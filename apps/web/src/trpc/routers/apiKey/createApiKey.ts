import { nanoid } from "nanoid";
import { z } from "zod";
import schema from "~/server/db/schema";
import { protectedProcedure } from "~/trpc/trpc";
export const createApiKey = protectedProcedure
  .input(
    z.object({
      name: z.string(),
    }),
  )
  .output(
    z.object({
      name: z.string(),
      token: z.string(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const apiKey = await ctx.db
      .insert(schema.apiKey)
      .values({
        userId: ctx.session.user.id,
        name: input.name,
        token: nanoid(),
      })
      .returning()
      .then((d) => d.at(0)!);

    return apiKey;
  });

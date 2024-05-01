import { z } from "zod";
import { protectedProcedure } from "~/server/api/trpc";

export const getProducers = protectedProcedure
  .input(
    z.object({
      limit: z.number().min(1).max(100).nullish(),
      cursor: z.number().nullish(),
    }),
  )
  .output(
    z.object({
      producers: z.array(
        z.object({
          id: z.number(),
          name: z.string(),
        }),
      ),
    }),
  )
  .query(async (opts) => {
    const { input, ctx } = opts;
    const limit = input.limit ?? 100;
    const { cursor } = input;

    const producers = await ctx.db.query.producers.findMany({
      where(fields, { eq, isNull, or }) {
        return or(
          eq(fields.userId, ctx.session.user.id),
          isNull(fields.userId),
        );
      },
    });

    let nextCursor: typeof cursor | undefined = undefined;
    if (producers.length > limit) {
      const nextItem = producers.pop();
      nextCursor = nextItem!.id;
    }

    return {
      producers,
      nextCursor,
    };
  });

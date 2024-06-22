import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "~/server/api/trpc";
import schema from "~/server/db/schema";

export const getHandlers = protectedProcedure
  .input(
    z.object({
      projectId: z.number(),
    }),
  )
  .output(
    z.object({
      handlers: z.array(
        z.object({
          id: z.number(),
          name: z.string(),
          description: z.string(),
          producer: z.object({
            name: z.string(),
            chainId: z.number(),
          }),
        }),
      ),
    }),
  )
  .query(async (opts) => {
    const { input, ctx } = opts;

    const handlers = await ctx.db
      .select()
      .from(schema.handler)
      .innerJoin(
        schema.projects,
        eq(schema.projects.id, schema.handler.projectId),
      )
      .innerJoin(
        schema.producers,
        eq(schema.producers.id, schema.handler.producerId),
      )
      .where(
        and(
          eq(schema.projects.userId, ctx.session.user.id),
          eq(schema.projects.id, input.projectId),
        ),
      )
      .then((handlers) =>
        handlers.map(({ handler, producer }) => ({
          ...handler,
          producer: producer,
        })),
      );

    return {
      handlers,
    };
  });

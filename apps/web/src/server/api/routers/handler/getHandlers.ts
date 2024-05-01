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
      .where(
        and(
          eq(schema.projects.userId, ctx.session.user.id),
          eq(schema.projects.id, input.projectId),
        ),
      )
      .then((handlers) => handlers.map(({ handler }) => handler));

    return {
      handlers,
    };
  });

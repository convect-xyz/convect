import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "~/server/api/trpc";
import schema from "~/server/db/schema";

export const getFunction = protectedProcedure
  .input(
    z.object({
      projectId: z.number(),
      handlerId: z.number(),
    }),
  )
  .output(
    z.object({
      id: z.number(),
      name: z.string(),
      isInitialised: z.boolean(),
      project: z.object({
        name: z.string(),
      }),
    }),
  )
  .query(async (opts) => {
    const { input, ctx } = opts;

    const handler = await ctx.db
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
          eq(schema.handler.id, input.handlerId),
        ),
      )
      .then((handlers) => handlers.at(0)!);

    return {
      ...handler.handler,
      isInitialised: true,
      project: handler.project,
    };
  });

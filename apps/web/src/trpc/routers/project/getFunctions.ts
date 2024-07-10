import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import schema from "~/server/db/schema";
import { protectedProcedure } from "~/trpc/trpc";

export const getFunctions = protectedProcedure
  .input(
    z.object({
      projectId: z.number(),
    }),
  )
  .output(
    z.object({
      functions: z.array(
        z.object({
          id: z.number(),
          name: z.string(),
          description: z.string(),
          handlers: z.array(
            z.object({
              chainId: z.number(),
            }),
          ),
        }),
      ),
    }),
  )
  .query(async (opts) => {
    const { input, ctx } = opts;

    const functions = await ctx.db
      .select()
      .from(schema.convectFunctions)
      .innerJoin(
        schema.projects,
        eq(schema.convectFunctions.projectId, schema.projects.id),
      )
      .where(
        and(
          eq(schema.projects.userId, ctx.session.user.id),
          eq(schema.projects.id, input.projectId),
        ),
      );

    const handlers = functions.length
      ? await ctx.db
          .select()
          .from(schema.handler)
          .innerJoin(
            schema.producers,
            eq(schema.handler.producerId, schema.producers.id),
          )
          .where(
            inArray(
              schema.handler.functionId,
              functions.map((f) => f.convectFunction.id),
            ),
          )
      : [];

    return {
      functions: functions.map((f) => {
        return {
          ...f.convectFunction,
          handlers: handlers
            .filter((h) => h.handler.functionId === f.convectFunction.id)
            .map((h) => ({
              chainId: h.producer.chainId,
            })),
        };
      }),
    };
  });

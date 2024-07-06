import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import schema from "~/server/db/schema";
import { protectedProcedure } from "~/trpc/trpc";

export const getHandler = protectedProcedure
  .input(
    z.object({
      handlerId: z.number(),
    }),
  )
  .output(
    z.object({
      id: z.number(),
      isInitialised: z.boolean(),
      producer: z.object({
        name: z.string(),
        chainId: z.number(),
      }),
    }),
  )
  .query(async (opts) => {
    const { input, ctx } = opts;

    const maybeHandler = await ctx.db
      .select()
      .from(schema.handler)
      .innerJoin(
        schema.producers,
        eq(schema.handler.producerId, schema.producers.id),
      )
      .innerJoin(
        schema.convectFunctions,
        eq(schema.handler.functionId, schema.convectFunctions.id),
      )
      .innerJoin(
        schema.projects,
        eq(schema.convectFunctions.projectId, schema.projects.id),
      )
      .where(
        and(
          eq(schema.handler.id, input.handlerId),
          eq(schema.projects.userId, ctx.session.user.id),
        ),
      )
      .then((handlers) => handlers.at(0));

    if (!maybeHandler) {
      throw new TRPCError({
        message: "This function does not exist",
        code: "NOT_FOUND",
      });
    }

    const { handler, producer } = maybeHandler;

    return {
      ...handler,
      isInitialised: true,
      producer,
    };
  });

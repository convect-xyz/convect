import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import schema from "~/server/db/schema";
import { protectedProcedure } from "~/trpc/trpc";

export const getFunction = protectedProcedure
  .input(
    z.object({
      projectId: z.number(),
      functionId: z.number(),
    }),
  )
  .output(
    z.object({
      id: z.number(),
      name: z.string(),
      description: z.string(),
      isInitialised: z.boolean(),
      project: z.object({
        name: z.string(),
      }),
      handlers: z.array(
        z.object({
          id: z.number(),
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

    const fn = await ctx.db
      .select()
      .from(schema.convectFunctions)
      .innerJoin(
        schema.projects,
        eq(schema.projects.id, schema.convectFunctions.projectId),
      )
      .where(
        and(
          eq(schema.projects.userId, ctx.session.user.id),
          eq(schema.projects.id, input.projectId),
          eq(schema.convectFunctions.id, input.functionId),
        ),
      )
      .then((fns) => fns.at(0));

    if (!fn) {
      throw new TRPCError({
        message: "This function does not exist",
        code: "NOT_FOUND",
      });
    }

    const handlers = await ctx.db.query.handler.findMany({
      where(fields, { and, eq }) {
        return and(eq(fields.functionId, input.functionId));
      },
      with: {
        producer: true,
      },
    });

    return {
      ...fn.convectFunction,
      isInitialised: true,
      project: fn.project,
      handlers,
    };
  });

import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import schema from "~/server/db/schema";
import { protectedProcedure } from "~/trpc/trpc";
import { throwIfNotProjectCollaborator } from "../permissions";

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
      activeDeployments: z.array(
        z.object({
          id: z.string(),
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
          eq(schema.projects.id, input.projectId),
          eq(schema.convectFunctions.id, input.functionId),
        ),
      )
      .then((fns) => fns.pop());
    if (!fn) {
      throw new TRPCError({
        message: "This function does not exist",
        code: "NOT_FOUND",
      });
    }

    await throwIfNotProjectCollaborator({
      projectId: fn.convectFunction.projectId,
      userId: ctx.session.user.id,
    });

    const activeDeployments = await ctx.db.query.deployment.findMany({
      where(fields, { eq }) {
        return eq(fields.functionId, input.functionId);
      },
      limit: 3,
      orderBy(fields, { desc }) {
        return desc(fields.createdAt);
      },
    });

    return {
      ...fn.convectFunction,
      isInitialised: true,
      project: fn.project,
      activeDeployments,
    };
  });

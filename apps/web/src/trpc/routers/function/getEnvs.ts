import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure } from "~/trpc/trpc";
import { throwIfNotProjectCollaborator } from "../permissions";

export const getEnvs = protectedProcedure
  .input(
    z.object({
      functionId: z.number(),
    }),
  )
  .output(
    z.array(
      z.object({
        id: z.number(),
        key: z.string(),
        encryptedValue: z.string(),
        lastUpdatedAt: z.number(),
      }),
    ),
  )
  .query(async ({ ctx, input }) => {
    const fn = await ctx.db.query.convectFunctions.findFirst({
      where(fields, { eq, and }) {
        return and(eq(fields.id, input.functionId));
      },
      with: {
        project: true,
        envs: true,
      },
    });
    if (!fn) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Handler not found" });
    }

    await throwIfNotProjectCollaborator({
      projectId: fn.projectId,
      userId: ctx.session.user.id,
    });

    return fn.envs.map((env) => ({
      ...env,
      encryptedValue: env.value,
      lastUpdatedAt: env.lastUpdatedAt.getTime(),
    }));
  });

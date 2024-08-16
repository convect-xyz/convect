import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { decryptEnvValue } from "~/lib/server/security";
import { protectedProcedure } from "~/trpc/trpc";
import { throwIfNotCollaborator } from "../permissions";

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
        value: z.string(),
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

    await throwIfNotCollaborator(fn.projectId, ctx.session.user.id);

    return fn.envs.map((env) => ({
      ...env,
      value: decryptEnvValue(env.value, env.iv),
      lastUpdatedAt: env.lastUpdatedAt.getTime(),
    }));
  });

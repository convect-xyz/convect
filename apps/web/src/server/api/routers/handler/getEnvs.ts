import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { decryptEnvValue } from "~/lib/server/security";
import { protectedProcedure } from "~/server/api/trpc";

export const getEnvs = protectedProcedure
  .input(
    z.object({
      handlerId: z.number(),
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
    const handler = await ctx.db.query.handler.findFirst({
      where(fields, { eq, and }) {
        return and(eq(fields.id, input.handlerId));
      },
      with: {
        project: true,
      },
    });

    if (!handler || handler.project.userId !== ctx.session.user.id) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Handler not found" });
    }

    const envs = await ctx.db.query.handlerEnv.findMany({
      where(fields, { eq, and }) {
        return and(eq(fields.handlerId, input.handlerId));
      },
    });

    return envs.map((env) => ({
      ...env,
      value: decryptEnvValue(env.value, env.iv),
      lastUpdatedAt: env.lastUpdatedAt.getTime(),
    }));
  });

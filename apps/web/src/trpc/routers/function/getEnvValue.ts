import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { decryptEnvValue } from "~/lib/server/security";
import { protectedProcedure } from "~/trpc/trpc";
import { throwIfNotProjectCollaborator } from "../permissions";

export const getEnvValue = protectedProcedure
  .input(
    z.object({
      functionId: z.number(),
      envId: z.number(),
    }),
  )
  .output(
    z.object({
      decryptedValue: z.string(),
    }),
  )
  .query(async ({ ctx, input }) => {
    const fn = await ctx.db.query.convectFunctions.findFirst({
      where(fields, { eq, and }) {
        return and(eq(fields.id, input.functionId));
      },
      with: {
        project: true,
        envs: {
          where(fields, operators) {
            return operators.eq(fields.id, input.envId);
          },
        },
      },
    });
    if (!fn) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Handler not found" });
    }

    await throwIfNotProjectCollaborator({
      projectId: fn.projectId,
      userId: ctx.session.user.id,
    });

    const env = fn.envs.find((e) => e.id === input.envId);
    if (!env) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Env not found" });
    }

    return {
      decryptedValue: decryptEnvValue(env.value, env.iv),
    };
  });

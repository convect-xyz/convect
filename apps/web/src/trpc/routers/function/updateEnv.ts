import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { encryptEnvValue } from "~/lib/server/security";
import schema from "~/server/db/schema";
import { protectedProcedure } from "~/trpc/trpc";
import { throwIfNotProjectCollaborator } from "../permissions";

export const updateEnv = protectedProcedure
  .input(
    z.object({
      functionId: z.coerce.number(),
      id: z.number(),
      newValue: z.string(),
      newKey: z.string(),
    }),
  )
  .output(z.object({}))
  .mutation(async ({ ctx, input }) => {
    const fn = await ctx.db.query.convectFunctions.findFirst({
      where: (fields, { eq, and }) => and(eq(fields.id, input.functionId)),
      with: {
        project: true,
      },
    });
    if (!fn) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Handler not found" });
    }

    await throwIfNotProjectCollaborator({
      projectId: fn.projectId,
      userId: ctx.session.user.id,
    });

    const encryptionResult = encryptEnvValue(input.newValue);
    await ctx.db
      .update(schema.functionEnv)
      .set({
        key: input.newKey,
        value: encryptionResult.value,
        iv: encryptionResult.iv,
        functionId: fn.id,
        lastUpdatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.functionEnv.functionId, fn.id),
          eq(schema.functionEnv.id, input.id),
        ),
      )
      .returning()
      .then((d) => d.at(0)!);

    return {};
  });

import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { encryptEnvValue } from "~/lib/server/security";
import { protectedProcedure } from "~/server/api/trpc";
import schema from "~/server/db/schema";

export const updateEnv = protectedProcedure
  .input(
    z.object({
      handlerId: z.coerce.number(),
      id: z.number(),
      newValue: z.string(),
    }),
  )
  .output(z.object({}))
  .mutation(async ({ ctx, input }) => {
    const handler = await ctx.db.query.handler.findFirst({
      where: (fields, { eq, and }) => and(eq(fields.id, input.handlerId)),
      with: {
        project: true,
      },
    });

    if (!handler || handler.project.userId !== ctx.session.user.id) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Handler not found" });
    }

    const encryptionResult = encryptEnvValue(input.newValue);
    await ctx.db
      .update(schema.handlerEnv)
      .set({
        value: encryptionResult.value,
        iv: encryptionResult.iv,
        handlerId: handler.id,
        lastUpdatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.handlerEnv.handlerId, handler.id),
          eq(schema.handlerEnv.id, input.id),
        ),
      )
      .returning()
      .then((d) => d.at(0)!);

    return {};
  });

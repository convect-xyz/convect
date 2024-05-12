import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { encryptEnvValue } from "~/lib/server/security";
import { protectedProcedure } from "~/server/api/trpc";
import schema from "~/server/db/schema";

export const addEnv = protectedProcedure
  .input(
    z.object({
      handlerId: z.coerce.number(),
      key: z.string(),
      value: z.string(),
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

    const encryptionResult = encryptEnvValue(input.value);
    await ctx.db
      .insert(schema.handlerEnv)
      .values({
        key: input.key,
        value: encryptionResult.value,
        iv: encryptionResult.iv,
        handlerId: handler.id,
      })
      .returning()
      .then((d) => d.at(0)!);

    return {};
  });

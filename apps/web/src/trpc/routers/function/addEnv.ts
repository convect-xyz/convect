import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { encryptEnvValue } from "~/lib/server/security";
import schema from "~/server/db/schema";
import { protectedProcedure } from "~/trpc/trpc";
import { throwIfNotCollaborator } from "../permissions";

export const addEnv = protectedProcedure
  .input(
    z.object({
      functionId: z.coerce.number(),
      key: z.string(),
      value: z.string(),
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

    await throwIfNotCollaborator(fn.projectId, ctx.session.user.id);

    const encryptionResult = encryptEnvValue(input.value);
    await ctx.db
      .insert(schema.functionEnv)
      .values({
        key: input.key,
        value: encryptionResult.value,
        iv: encryptionResult.iv,
        functionId: fn.id,
      })
      .returning()
      .then((d) => d.at(0)!);

    return {};
  });

import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import schema from "~/server/db/schema";
import { protectedProcedure } from "~/trpc/trpc";

export const updateName = protectedProcedure
  .input(
    z.object({
      functionId: z.number(),
      name: z.string(),
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

    if (!fn || fn.project.userId !== ctx.session.user.id) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Handler not found" });
    }

    await ctx.db
      .update(schema.convectFunctions)
      .set({ name: input.name })
      .where(eq(schema.convectFunctions.id, fn.id));

    return {};
  });

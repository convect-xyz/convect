import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "~/server/api/trpc";
import schema from "~/server/db/schema";

export const updateName = protectedProcedure
  .input(
    z.object({
      handlerId: z.number(),
      name: z.string(),
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

    await ctx.db
      .update(schema.handler)
      .set({ name: input.name })
      .where(eq(schema.handler.id, handler.id));

    return {};
  });

import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "~/server/api/trpc";
import schema from "~/server/db/schema";

export const deleteEnv = protectedProcedure
  .input(
    z.object({
      handlerId: z.number(),
      id: z.number(),
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
      throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
    }

    await ctx.db
      .delete(schema.handlerEnv)
      .where(
        and(
          eq(schema.handlerEnv.id, input.id),
          eq(schema.handlerEnv.handlerId, handler.id),
        ),
      )
      .returning()
      .then((d) => d.at(0)!);

    return {};
  });

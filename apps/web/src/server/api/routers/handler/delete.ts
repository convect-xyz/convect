import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { env } from "~/env";
import { destroyDeployment } from "~/server/actions/builds";
import { protectedProcedure } from "~/server/api/trpc";
import schema from "~/server/db/schema";

export const deleteFunction = protectedProcedure
  .input(
    z.object({
      handlerId: z.number(),
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

    if (!handler) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Handler not found" });
    }

    if (handler.project.userId !== ctx.session.user.id) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Handler not found" });
    }

    await destroyDeployment({
      version: env.VERSION,
      internalHandlerId: handler.internalId,
      internalHandlerVersion: handler.version,
    });

    await ctx.db
      .delete(schema.handler)
      .where(eq(schema.handler.id, handler.id));

    return {};
  });

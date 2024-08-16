import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import schema from "~/server/db/schema";
import { protectedProcedure } from "~/trpc/trpc";
import { throwIfNotProjectCollaborator } from "../permissions";

export const updateDescription = protectedProcedure
  .input(
    z.object({
      functionId: z.number(),
      description: z.string(),
    }),
  )
  .output(z.object({}))
  .mutation(async ({ ctx, input }) => {
    const handler = await ctx.db.query.convectFunctions.findFirst({
      where: (fields, { eq, and }) => and(eq(fields.id, input.functionId)),
      with: {
        project: true,
      },
    });

    if (!handler) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Handler not found" });
    }

    await throwIfNotProjectCollaborator({
      projectId: handler.projectId,
      userId: ctx.session.user.id,
    });

    await ctx.db
      .update(schema.convectFunctions)
      .set({ description: input.description })
      .where(eq(schema.convectFunctions.id, handler.id));

    return {};
  });

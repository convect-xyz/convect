import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import schema from "~/server/db/schema";
import { protectedProcedure } from "~/trpc/trpc";
import { throwIfNotProjectCollaborator } from "../permissions";

export const deleteEnv = protectedProcedure
  .input(
    z.object({
      functionId: z.number(),
      id: z.number(),
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
      throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
    }

    await throwIfNotProjectCollaborator({
      projectId: fn.projectId,
      userId: ctx.session.user.id,
    });
    await ctx.db
      .delete(schema.functionEnv)
      .where(
        and(
          eq(schema.functionEnv.id, input.id),
          eq(schema.functionEnv.functionId, fn.id),
        ),
      )
      .returning()
      .then((d) => d.at(0)!);

    return {};
  });

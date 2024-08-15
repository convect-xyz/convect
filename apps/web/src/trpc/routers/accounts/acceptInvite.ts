import { schema } from "@convect-xyz/lib";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "~/trpc/trpc";

export const acceptInvite = protectedProcedure
  .input(
    z.object({
      inviteId: z.number(),
    }),
  )
  .output(z.object({}))
  .mutation(async ({ ctx, input }) => {
    const invite = await ctx.db.query.pendingInvites.findFirst({
      where: (fields, { eq, and }) =>
        and(
          eq(fields.id, input.inviteId),
          eq(fields.userId, ctx.session.user.id),
        ),
    });

    if (!invite) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Invite not found",
      });
    }

    await ctx.db.transaction(async (tx) => {
      await tx
        .delete(schema.pendingInvites)
        .where(eq(schema.pendingInvites.id, input.inviteId));

      await tx.insert(schema.projectCollaborators).values({
        projectId: invite.projectId,
        userId: ctx.session.user.id,
      });
    });

    return {};
  });

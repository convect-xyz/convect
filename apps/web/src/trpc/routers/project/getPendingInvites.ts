import { z } from "zod";
import { protectedProcedure } from "~/trpc/trpc";
import { throwIfNotProjectCollaborator } from "../permissions";

export const getPendingInvites = protectedProcedure
  .input(
    z.object({
      projectId: z.number(),
    }),
  )
  .output(
    z.array(
      z.object({
        user: z.object({
          id: z.string(),
          email: z.string(),
        }),
      }),
    ),
  )
  .query(async ({ ctx, input }) => {
    await throwIfNotProjectCollaborator({
      projectId: input.projectId,
      userId: ctx.session.user.id,
    });

    const pendingInvites = await ctx.db.query.pendingInvites.findMany({
      where(fields, { eq }) {
        return eq(fields.projectId, input.projectId);
      },
      with: {
        user: true,
      },
    });

    return pendingInvites.map((invite) => ({
      user: {
        id: invite.userId,
        email: invite.user.email,
      },
    }));
  });

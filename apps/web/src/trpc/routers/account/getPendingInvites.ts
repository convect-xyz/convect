import { z } from "zod";
import { protectedProcedure } from "~/trpc/trpc";

export const getPendingInvites = protectedProcedure
  .output(
    z.array(
      z.object({
        id: z.number(),
        project: z.object({
          id: z.number(),
          name: z.string(),
        }),
      }),
    ),
  )
  .query(async ({ ctx }) => {
    const pendingInvites = await ctx.db.query.pendingInvites.findMany({
      where(fields, { eq, and }) {
        return and(eq(fields.userId, ctx.session.user.id));
      },
      with: {
        project: true,
      },
    });

    return pendingInvites.map((invite) => ({
      id: invite.id,
      project: {
        id: invite.projectId,
        name: invite.project.name,
      },
    }));
  });

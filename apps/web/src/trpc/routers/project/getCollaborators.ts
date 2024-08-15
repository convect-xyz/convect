import { z } from "zod";
import { protectedProcedure } from "~/trpc/trpc";

export const getCollaborators = protectedProcedure
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
    const collaborators = await ctx.db.query.projectCollaborators.findMany({
      where(fields, { eq, and }) {
        return and(
          eq(fields.userId, ctx.session.user.id),
          eq(fields.projectId, input.projectId),
        );
      },
      with: {
        user: true,
      },
    });

    return collaborators.map((invite) => ({
      user: {
        id: invite.userId,
        email: invite.user.email,
      },
    }));
  });

import { z } from "zod";
import { protectedProcedure } from "~/trpc/trpc";
import { throwIfNotProjectCollaborator } from "../permissions";

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
          isOwner: z.boolean(),
        }),
      }),
    ),
  )
  .query(async ({ ctx, input }) => {
    throwIfNotProjectCollaborator({
      projectId: input.projectId,
      userId: ctx.session.user.id,
    });

    const collaborators = await ctx.db.query.projectCollaborators.findMany({
      where(fields, { eq, and }) {
        return and(eq(fields.projectId, input.projectId));
      },
      with: {
        user: true,
        project: true,
      },
    });

    return collaborators.map((invite) => ({
      user: {
        id: invite.userId,
        email: invite.user.email,
        isOwner: invite.userId === invite.project.userId,
      },
    }));
  });

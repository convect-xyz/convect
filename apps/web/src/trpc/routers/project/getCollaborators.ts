import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure } from "~/trpc/trpc";
import { getCollaborator } from "../permissions";

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
    const collaborator = await getCollaborator(
      input.projectId,
      ctx.session.user.id,
    );
    if (!collaborator) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
    }

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

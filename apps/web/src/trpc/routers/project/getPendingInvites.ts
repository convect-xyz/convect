import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure } from "~/trpc/trpc";
import { getCollaborator } from "../permissions";

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
    const collaborator = await getCollaborator(
      input.projectId,
      ctx.session.user.id,
    );
    if (!collaborator) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
    }

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

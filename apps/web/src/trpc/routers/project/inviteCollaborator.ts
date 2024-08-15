import { schema } from "@convect-xyz/lib";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure } from "~/trpc/trpc";

export const inviteCollaborator = protectedProcedure
  .input(
    z
      .object({
        projectId: z.number(),
      })
      .and(z.object({ type: z.literal("email"), email: z.string() })),
  )
  .output(z.object({}))
  .mutation(async ({ ctx, input }) => {
    const project = await ctx.db.query.projects.findFirst({
      where: (fields, { eq, and }) =>
        and(
          eq(fields.id, input.projectId),
          eq(fields.userId, ctx.session.user.id),
        ),
    });

    if (!project) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Project not found",
      });
    }

    const invitee = await ctx.db.query.users.findFirst({
      where: (fields, { eq }) => eq(fields.email, input.email),
    });

    if (!invitee) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Invitee not found",
      });
    }

    await ctx.db.transaction(async (tx) => {
      const existingInvite = await tx.query.pendingInvites.findFirst({
        where: (fields, { eq, and }) => {
          return and(
            eq(fields.projectId, input.projectId),
            eq(fields.userId, ctx.session.user.id),
          );
        },
      });

      if (existingInvite) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Invite already exists",
        });
      }

      await tx.insert(schema.pendingInvites).values({
        projectId: input.projectId,
        userId: ctx.session.user.id,
      });
    });

    return {};
  });

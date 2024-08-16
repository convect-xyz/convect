import { schema } from "@convect-xyz/lib";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import InviteSentTemplate from "~/components/emails/InviteSentTemplate";
import { sendNoReply } from "~/lib/server/resend";
import { protectedProcedure } from "~/trpc/trpc";
import { getCollaborator } from "../permissions";

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
    const collaborator = await getCollaborator(
      input.projectId,
      ctx.session.user.id,
    );
    if (!collaborator) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
    }

    const project = await ctx.db.query.projects.findFirst({
      where: (fields, { eq, and }) => and(eq(fields.id, input.projectId)),
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

    const pendingInvite = await ctx.db.transaction(async (tx) => {
      const existingInvite = await tx.query.pendingInvites.findFirst({
        where: (fields, { eq, and }) => {
          return and(
            eq(fields.projectId, input.projectId),
            eq(fields.userId, invitee.id),
          );
        },
      });

      if (existingInvite) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Invite already exists",
        });
      }

      const existingCollaborator =
        await tx.query.projectCollaborators.findFirst({
          where: (fields, { eq, and }) => {
            return and(
              eq(fields.projectId, input.projectId),
              eq(fields.userId, invitee.id),
            );
          },
        });

      if (existingCollaborator) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User is already a collaborator",
        });
      }

      return await tx
        .insert(schema.pendingInvites)
        .values({
          projectId: input.projectId,
          userId: invitee.id,
        })
        .returning()
        .then((res) => res.pop()!);
    });

    await sendNoReply({
      subject: "You have been invited to join a Convect project",
      to: invitee.email,
      react: InviteSentTemplate({
        inviteId: pendingInvite.id.toString(),
        senderUsername: ctx.session.user.name ?? "",
        projectName: project.name,
      }),
    });

    return {};
  });

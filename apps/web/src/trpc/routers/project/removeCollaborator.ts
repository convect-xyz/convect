import { schema } from "@convect-xyz/server";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "~/trpc/trpc";
import { getCollaborator, throwIfNotProjectOwner } from "../permissions";

export const removeCollaborator = protectedProcedure
  .input(
    z.object({
      projectId: z.number(),
      email: z.string(),
    }),
  )
  .output(z.object({}))
  .mutation(async ({ ctx, input }) => {
    const { project } = await throwIfNotProjectOwner({
      projectId: input.projectId,
      userId: ctx.session.user.id,
    });

    const userToDelete = await ctx.db.query.users.findFirst({
      where: (fields, { eq }) => eq(fields.email, input.email),
    });
    if (!userToDelete) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User is not collaborating on this project",
      });
    }

    const collaborator = await getCollaborator(
      input.projectId,
      userToDelete.id,
    );
    if (!collaborator) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User is not collaborating on this project",
      });
    }

    if (collaborator.userId === project.userId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Owner cannot be removed",
      });
    }

    await ctx.db
      .delete(schema.projectCollaborators)
      .where(
        and(
          eq(schema.projectCollaborators.projectId, input.projectId),
          eq(schema.projectCollaborators.userId, userToDelete.id),
        ),
      );

    return {};
  });

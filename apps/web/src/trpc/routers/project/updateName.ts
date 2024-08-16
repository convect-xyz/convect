import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import schema from "~/server/db/schema";
import { protectedProcedure } from "~/trpc/trpc";
import { getCollaborator } from "../permissions";

export const updateName = protectedProcedure
  .input(
    z.object({
      projectId: z.number(),
      name: z.string(),
    }),
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
      throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
    }

    await ctx.db
      .update(schema.projects)
      .set({ name: input.name })
      .where(eq(schema.projects.id, project.id));

    return {};
  });

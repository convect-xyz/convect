import { z } from "zod";
import xZod from "~/lib/shared/validation";
import schema from "~/server/db/schema";
import { protectedProcedure } from "~/trpc/trpc";

export const createProject = protectedProcedure
  .input(z.object({ name: xZod.handler }))
  .output(
    z.object({
      id: z.number(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const newProject = await ctx.db.transaction(async (tx) => {
      const newProject = await tx
        .insert(schema.projects)
        .values({
          name: input.name,
          userId: ctx.session.user.id,
        })
        .returning()
        .then((v) => v.at(0)!);

      await tx.insert(schema.projectCollaborators).values({
        projectId: newProject.id,
        userId: ctx.session.user.id,
      });

      return newProject;
    });
    return {
      id: newProject.id,
      name: newProject.name,
    };
  });

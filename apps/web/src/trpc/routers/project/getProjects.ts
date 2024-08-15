import { z } from "zod";
import { protectedProcedure } from "~/trpc/trpc";

export const getProjects = protectedProcedure
  .output(
    z.array(
      z.object({
        id: z.number(),
        name: z.string(),
      }),
    ),
  )
  .query(async ({ ctx }) => {
    const collaborations = await ctx.db.query.projectCollaborators.findMany({
      where(fields, { eq }) {
        return eq(fields.userId, ctx.session.user.id);
      },
    });

    const projects = await ctx.db.query.projects.findMany({
      where(fields, { eq, or, inArray }) {
        return or(
          eq(fields.userId, ctx.session.user.id),
          inArray(
            fields.id,
            collaborations.map((c) => c.projectId),
          ),
        );
      },
    });

    return projects;
  });

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
      with: {
        project: true,
      },
    });

    return collaborations.map((c) => ({
      id: c.project.id,
      name: c.project.name,
    }));
  });

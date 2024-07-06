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
    const projects = await ctx.db.query.projects.findMany({
      where(fields, { eq, and }) {
        return eq(fields.userId, ctx.session.user.id);
      },
    });

    return projects;
  });

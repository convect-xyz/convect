import { z } from "zod";
import xZod from "~/lib/shared/validation";
import { protectedProcedure } from "~/server/api/trpc";
import schema from "~/server/db/schema";

export const createProject = protectedProcedure
  .input(z.object({ name: xZod.handler }))
  .output(
    z.object({
      id: z.number(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const newProject = await ctx.db
      .insert(schema.projects)
      .values({
        name: input.name,
        userId: ctx.session.user.id,
      })
      .returning()
      .then((v) => v.at(0)!);

    return {
      id: newProject.id,
      name: newProject.name,
    };
  });

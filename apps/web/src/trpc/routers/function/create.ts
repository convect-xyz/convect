import { init } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { env } from "~/env";
import xZod from "~/lib/shared/validation";
import schema from "~/server/db/schema";
import { protectedProcedure } from "~/trpc/trpc";

const createId = init({
  random: Math.random,
  length: 8,
});

export const createFunction = protectedProcedure
  .input(
    z.object({
      projectId: z.coerce.number(),
      name: xZod.handler,
    }),
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
      throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
    }

    const fn = await ctx.db
      .insert(schema.convectFunctions)
      .values({
        projectId: project.id,
        name: input.name,
        infraVersion: env.VERSION,
      })
      .returning()
      .then((d) => d.at(0)!);

    return {};
  });

import { init } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import xZod from "~/lib/shared/validation";
import { protectedProcedure } from "~/server/api/trpc";
import schema from "~/server/db/schema";

const createId = init({
  random: Math.random,
  length: 8,
});

export const createHandler = protectedProcedure
  .input(
    z.object({
      projectId: z.coerce.number(),
      producerId: z.coerce.number(),
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

    const newHandler = await ctx.db
      .insert(schema.handler)
      .values({
        producerId: input.producerId,
        projectId: project.id,
        name: input.name,
        version: -1,
        internalId: createId(),
      })
      .returning()
      .then((d) => d.at(0)!);

    return {};
  });

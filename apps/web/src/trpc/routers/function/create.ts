import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { env } from "~/env";
import { quota } from "~/lib/server/products";
import { currentMonthUsage } from "~/lib/server/products/usage";
import xZod from "~/lib/shared/validation";
import schema from "~/server/db/schema";
import { protectedProcedure } from "~/trpc/trpc";
import { throwIfNotProjectCollaborator } from "../permissions";

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
      where: (fields, { eq, and }) => and(eq(fields.id, input.projectId)),
    });
    if (!project) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
    }

    const convectFunctionsUsage = await currentMonthUsage
      .convectFunctions(input.projectId)
      .then((d) => d.usage);
    const allowedFunctions = await quota.byProject("convectFunctions", project);
    if (convectFunctionsUsage >= allowedFunctions) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `You have reached the limit of ${allowedFunctions} functions for this project. Upgrade your plan to add more functions.`,
      });
    }

    await throwIfNotProjectCollaborator({
      projectId: input.projectId,
      userId: ctx.session.user.id,
    });

    await ctx.db
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

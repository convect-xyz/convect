import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { env } from "~/env";
import { AppError } from "~/lib/server/error/app";
import { quotaService } from "~/lib/server/products";
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
      where: (fields, { eq }) => eq(fields.id, input.projectId),
    });
    if (!project) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
    }

    await throwIfNotProjectCollaborator({
      projectId: input.projectId,
      userId: ctx.session.user.id,
    });

    const { hasUsedQuota, quota } = await quotaService.hasUsedQuota(
      "convectFunctions",
      input.projectId,
    );
    if (hasUsedQuota) {
      throw new AppError(
        `You have reached the limit of ${quota} functions for this project. Upgrade your plan to add more functions.`,
        "FUNCTION_QUOTA_EXCEEDED",
      );
    }

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

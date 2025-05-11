import { getDb } from "@convect-xyz/server";
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

    const [existing, { hasUsedQuota, quota }] = await Promise.all([
      isFunctionNameTaken(ctx.db, input.name, input.projectId),
      quotaService.hasUsedQuota("convectFunctions", input.projectId),
    ]);
    if (hasUsedQuota) {
      throw new AppError(
        `You have reached the limit of ${quota} functions for this project. Upgrade your plan to add more functions.`,
        "FUNCTION_QUOTA_EXCEEDED",
      );
    }
    if (existing) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Function name already in use",
      });
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

async function isFunctionNameTaken(
  db: ReturnType<typeof getDb>,
  name: string,
  projectId: number,
) {
  const existing = await db.query.convectFunctions.findFirst({
    where: (fields, { eq, and }) =>
      and(eq(fields.name, name), eq(fields.projectId, projectId)),
  });

  return existing;
}

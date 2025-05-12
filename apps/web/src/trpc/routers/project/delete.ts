import { ConvectFunctionFacade } from "@convect-xyz/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { env } from "~/env";
import { ecs, s3 } from "~/lib/server/aws";
import { planService } from "~/lib/server/products";
import { getStackOutputs } from "~/server/actions/pulumi/getStackOutputs";
import schema from "~/server/db/schema";
import { protectedProcedure } from "~/trpc/trpc";
import { throwIfNotProjectCollaborator } from "../permissions";

export const deleteProject = protectedProcedure
  .input(
    z.object({
      projectId: z.number(),
    }),
  )
  .output(z.object({}))
  .mutation(async ({ ctx, input }) => {
    await throwIfNotProjectCollaborator({
      projectId: input.projectId,
      userId: ctx.session.user.id,
    });

    const project = await ctx.db.query.projects.findFirst({
      where: eq(schema.projects.id, input.projectId),
      with: {
        functions: true,
      },
    });
    if (!project) {
      throw new Error("Project not found");
    }

    const outputs = await getStackOutputs();

    const promises = [];
    for (const fn of project.functions) {
      promises.push(
        new ConvectFunctionFacade(fn.id, {
          s3: s3,
          ecs: ecs,
          db: ctx.db,
        }).destroy({
          version: fn.infraVersion!,
          databaseUrl: env.DATABASE_URL,
          taskDefinition: outputs.builderTaskDefinition,
        }),
      );
    }

    await Promise.all(promises);

    await planService.cancelSubscription(project);

    await ctx.db
      .delete(schema.projects)
      .where(eq(schema.projects.id, input.projectId));

    return {};
  });

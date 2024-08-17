import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { parseManifest } from "~/lib/shared/manifest";
import schema from "~/server/db/schema";
import { protectedProcedure } from "~/trpc/trpc";
import { throwIfNotProjectCollaborator } from "../permissions";

export const getFunctions = protectedProcedure
  .input(
    z.object({
      projectId: z.number(),
    }),
  )
  .output(
    z.object({
      functions: z.array(
        z.object({
          id: z.number(),
          name: z.string(),
          description: z.string(),
          chains: z
            .array(
              z.object({
                chainId: z.number(),
              }),
            )
            .nullable(),
        }),
      ),
    }),
  )
  .query(async ({ ctx, input }) => {
    await throwIfNotProjectCollaborator({
      projectId: input.projectId,
      userId: ctx.session.user.id,
    });

    const mostRecentDeployments = ctx.db
      .selectDistinctOn([schema.deployment.functionId], {
        functionId: schema.deployment.functionId,
        manifest: schema.deployment.manifest,
      })
      .from(schema.deployment)
      .where(and(eq(schema.deployment.status, "SUCCESS")))
      .orderBy(
        desc(schema.deployment.functionId),
        desc(schema.deployment.createdAt),
      )
      .as("mostRecentDeployment");

    const functions = await ctx.db
      .select()
      .from(schema.convectFunctions)
      .leftJoin(
        mostRecentDeployments,
        eq(schema.convectFunctions.id, mostRecentDeployments.functionId),
      )
      .where(eq(schema.convectFunctions.projectId, input.projectId));

    return {
      functions: functions.map((f) => {
        const manifest = f.mostRecentDeployment
          ? parseManifest(f.mostRecentDeployment.manifest)
          : null;

        return {
          ...f.convectFunction,
          chains: manifest?.chains ?? null,
        };
      }),
    };
  });

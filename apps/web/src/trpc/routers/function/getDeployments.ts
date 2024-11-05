import { manifestSchema, parseManifest } from "@convect-xyz/lib";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "~/server/db";
import { protectedProcedure } from "~/trpc/trpc";
import { throwIfNotProjectCollaborator } from "../permissions";

export const getDeployments = protectedProcedure
  .input(
    z.object({
      functionId: z.number(),
    }),
  )
  .output(
    z.array(
      z.object({
        id: z.string(),
        status: z.enum(["PENDING", "RUNNING", "SUCCESS", "FAILED"]),
        createdAt: z.number(),
        manifest: manifestSchema,
        runningAt: z.number().nullish(),
        finishedAt: z.number().nullish(),
      }),
    ),
  )
  .query(async ({ input, ctx }) => {
    const convectFn = await ctx.db.query.convectFunctions.findFirst({
      where(fields, { eq }) {
        return eq(fields.id, input.functionId);
      },
    });
    if (!convectFn) {
      throw new TRPCError({ message: "Handler not found", code: "NOT_FOUND" });
    }

    await throwIfNotProjectCollaborator({
      projectId: convectFn.projectId,
      userId: ctx.session.user.id,
    });

    const deployments = await db.query.deployment.findMany({
      where: (fields, { eq }) => eq(fields.functionId, convectFn.id),
      orderBy(fields, { desc }) {
        return desc(fields.createdAt);
      },
      limit: 50,
    });

    return deployments.map((deployment) => ({
      id: deployment.id,
      status: deployment.status,
      createdAt: deployment.createdAt.getTime(),
      manifest: parseManifest(deployment.manifest),
      runningAt: deployment.runningAt?.getTime(),
      finishedAt: deployment.finishedAt?.getTime(),
    }));
  });

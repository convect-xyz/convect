import { manifestSchema, parseManifest } from "@convect-xyz/lib";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "~/server/db";
import { protectedProcedure } from "~/trpc/trpc";
import { throwIfNotProjectCollaborator } from "../permissions";

export const getPendingDeployment = protectedProcedure
  .input(
    z.object({
      deploymentId: z.string(),
    }),
  )
  .output(
    z.object({
      deployment: z.object({
        id: z.string(),
        status: z.enum([
          "WAITING_FOR_APPROVAL",
          "PENDING",
          "RUNNING",
          "SUCCESS",
          "FAILED",
        ]),
        createdAt: z.number(),
        manifest: manifestSchema,
        runningAt: z.number().nullish(),
        finishedAt: z.number().nullish(),
      }),
      function: z.object({
        id: z.number(),
        name: z.string(),
        project: z.object({
          id: z.number(),
          name: z.string(),
        }),
      }),
    }),
  )
  .query(async ({ input, ctx }) => {
    const deployment = await db.query.deployment.findFirst({
      where: (fields, { eq, and }) => {
        let baseFilter = and(eq(fields.id, input.deploymentId));
        return baseFilter;
      },
      orderBy(fields, { desc }) {
        return [desc(fields.createdAt), desc(fields.id)];
      },
    });

    if (!deployment) {
      throw new TRPCError({
        message: "Deployment not found",
        code: "NOT_FOUND",
      });
    }

    const convectFn = await ctx.db.query.convectFunctions.findFirst({
      where(fields, { eq }) {
        return eq(fields.id, deployment.functionId);
      },
      with: {
        project: true,
      },
    });
    if (!convectFn) {
      throw new TRPCError({ message: "Handler not found", code: "NOT_FOUND" });
    }

    await throwIfNotProjectCollaborator({
      projectId: convectFn.projectId,
      userId: ctx.session.user.id,
    });

    return {
      deployment: {
        id: deployment.id,
        status: deployment.status,
        createdAt: deployment.createdAt.getTime(),
        manifest: parseManifest(deployment.manifest),
        runningAt: deployment.runningAt?.getTime(),
        finishedAt: deployment.finishedAt?.getTime(),
      },
      function: {
        id: convectFn.id,
        name: convectFn.name,
        project: {
          id: convectFn.projectId,
          name: convectFn.project.name,
        },
      },
    };
  });

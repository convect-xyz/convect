import { manifestSchema, parseManifest } from "@convect-xyz/lib";
import { TRPCError } from "@trpc/server";
import { or } from "drizzle-orm";
import { z } from "zod";
import { db } from "~/server/db";
import { protectedProcedure } from "~/trpc/trpc";
import { throwIfNotProjectCollaborator } from "../permissions";

export const getDeployments = protectedProcedure
  .input(
    z.object({
      functionId: z.number(),
      cursor: z
        .object({
          id: z.string(),
          createdAt: z.number().transform((v) => new Date(v)),
        })
        .nullish(),
    }),
  )
  .output(
    z.object({
      deployments: z.array(
        z.object({
          id: z.string(),
          status: z.enum(["PENDING", "RUNNING", "SUCCESS", "FAILED"]),
          createdAt: z.number(),
          manifest: manifestSchema,
          runningAt: z.number().nullish(),
          finishedAt: z.number().nullish(),
        }),
      ),
      nextCursor: z
        .object({
          id: z.string(),
          createdAt: z.number(),
        })
        .nullish(),
    }),
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
      where: (fields, { eq, and, lt }) => {
        let baseFilter = and(eq(fields.functionId, convectFn.id));
        if (input.cursor) {
          baseFilter = and(
            baseFilter,
            or(
              lt(fields.createdAt, input.cursor.createdAt),
              and(
                eq(fields.createdAt, input.cursor.createdAt),
                lt(fields.id, input.cursor.id),
              ),
            ),
          );
        }
        return baseFilter;
      },
      orderBy(fields, { desc }) {
        return [desc(fields.createdAt), desc(fields.id)];
      },
      limit: 10,
    });

    const nextCursorDeployment = deployments[deployments.length - 1];
    return {
      deployments: deployments.map((deployment) => ({
        id: deployment.id,
        status: deployment.status,
        createdAt: deployment.createdAt.getTime(),
        manifest: parseManifest(deployment.manifest),
        runningAt: deployment.runningAt?.getTime(),
        finishedAt: deployment.finishedAt?.getTime(),
      })),
      nextCursor: nextCursorDeployment
        ? {
            id: nextCursorDeployment.id,
            createdAt: nextCursorDeployment.createdAt.getTime(),
          }
        : undefined,
    };
  });

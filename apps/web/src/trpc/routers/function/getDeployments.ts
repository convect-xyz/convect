import { TRPCError } from "@trpc/server";
import { desc } from "drizzle-orm";
import { z } from "zod";
import { manifestSchema, parseManifest } from "~/lib/shared/manifest";
import { db } from "~/server/db";
import { protectedProcedure } from "~/trpc/trpc";
import { throwIfNotCollaborator } from "../permissions";

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

    await throwIfNotCollaborator(convectFn.projectId, ctx.session.user.id);

    const deployments = await db.query.deployment.findMany({
      where: (fields, { eq }) => eq(fields.functionId, convectFn.id),
      orderBy(fields, operators) {
        return desc(fields.createdAt);
      },
    });

    return deployments.map((deployment) => ({
      id: deployment.id,
      status: deployment.status,
      createdAt: deployment.createdAt.getTime(),
      manifest: parseManifest(deployment.manifest),
    }));
  });

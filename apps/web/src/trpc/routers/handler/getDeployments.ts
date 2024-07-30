import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "~/server/db";
import { protectedProcedure } from "~/trpc/trpc";

export const getDeployments = protectedProcedure
  .input(
    z.object({
      handlerId: z.number(),
    }),
  )
  .output(
    z.array(
      z.object({
        id: z.string(),
        status: z.enum(["PENDING", "RUNNING", "SUCCESS", "FAILED"]),
        createdAt: z.number(),
      }),
    ),
  )
  .query(async ({ input, ctx }) => {
    const handler = await ctx.db.query.handler.findFirst({
      where(fields, { eq }) {
        return eq(fields.id, input.handlerId);
      },
    });

    if (!handler) {
      throw new TRPCError({ message: "Handler not found", code: "NOT_FOUND" });
    }

    const deployments = await db.query.deployment.findMany({
      where: (fields, { eq }) => eq(fields.handlerId, handler.id),
    });
    return deployments.map((deployment) => ({
      id: deployment.id,
      status: deployment.status,
      createdAt: deployment.createdAt.getTime(),
    }));
  });

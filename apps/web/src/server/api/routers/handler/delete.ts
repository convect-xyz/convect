import {
  getEventsArn,
  getHandlerArn,
  getLogFetcherArn,
  getOrchestratorArn,
  getTxQueueUrl,
} from "@kayakthedev/lib";
import { TRPCError } from "@trpc/server";
import { InferSelectModel, eq } from "drizzle-orm";
import { z } from "zod";
import { lambda, sqs } from "~/lib/server/aws";
import { protectedProcedure } from "~/server/api/trpc";
import schema from "~/server/db/schema";

export async function cleanup(
  handler: InferSelectModel<typeof schema.handler>,
) {
  await Promise.allSettled([
    lambda.deleteFunction({
      FunctionName: getHandlerArn({
        handlerId: handler.internalId,
        region: "eu-west-1",
      }),
    }),
    lambda.deleteFunction({
      FunctionName: getLogFetcherArn({
        handlerId: handler.internalId,
        region: "eu-west-1",
      }),
    }),
    lambda.deleteFunction({
      FunctionName: getOrchestratorArn({
        handlerId: handler.internalId,
        region: "eu-west-1",
      }),
    }),
    lambda.deleteFunction({
      FunctionName: getEventsArn({
        handlerId: handler.internalId,
        region: "eu-west-1",
      }),
    }),
    sqs.deleteQueue({
      QueueUrl: getTxQueueUrl({
        handlerId: handler.internalId,
        region: "eu-west-1",
      }),
    }),
  ]);
}

export const deleteHandler = protectedProcedure
  .input(
    z.object({
      handlerId: z.number(),
    }),
  )
  .output(z.object({}))
  .mutation(async ({ ctx, input }) => {
    const handler = await ctx.db.query.handler.findFirst({
      where: (fields, { eq, and }) => and(eq(fields.id, input.handlerId)),
      with: {
        project: true,
      },
    });

    if (!handler) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Handler not found" });
    }

    if (handler.project.userId !== ctx.session.user.id) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Handler not found" });
    }

    await ctx.db
      .delete(schema.handler)
      .where(eq(schema.handler.id, handler.id));

    await cleanup(handler);

    return {};
  });

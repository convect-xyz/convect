import { TRPCError } from "@trpc/server";
import { InferSelectModel, eq } from "drizzle-orm";
import { z } from "zod";
import { lambda, sns, sqs } from "~/lib/server/aws";
import { protectedProcedure } from "~/server/api/trpc";
import schema from "~/server/db/schema";

async function cleanup(handler: InferSelectModel<typeof schema.handler>) {
  await Promise.all([
    lambda.deleteFunction({
      FunctionName: handler.handlerArn!,
    }),
    lambda.deleteFunction({
      FunctionName: handler.logFetcherArn!,
    }),
    lambda.deleteFunction({
      FunctionName: handler.orchestratorArn!,
    }),
    sqs.deleteQueue({
      QueueUrl: handler.txQueueUrl!,
    }),
    lambda.deleteEventSourceMapping({
      UUID: handler.handlerToTxQueueEventSourceMappingUuid!,
    }),
    sns.unsubscribe({
      SubscriptionArn: handler.orchestratorSubscriptionArn!,
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

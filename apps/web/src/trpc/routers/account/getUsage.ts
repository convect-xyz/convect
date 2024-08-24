import { analysisSchema } from "@convect-xyz/lib";
import { and, count, gt, lt } from "drizzle-orm";
import { z } from "zod";
import { analysisDb } from "~/server/db/analysis";
import { protectedProcedure } from "~/trpc/trpc";

export const getUsage = protectedProcedure
  .input(
    z.object({
      periodStart: z.number(),
      periodEnd: z.number(),
    }),
  )
  .output(
    z.object({
      numProcessedTransactions: z.number(),
    }),
  )
  .query(async ({ ctx, input }) => {
    const { periodStart, periodEnd } = input;
    const numProcessedTransactions = await getProcessedTransactionCount(
      periodStart,
      periodEnd,
    );

    return {
      numProcessedTransactions,
    };
  });

async function getProcessedTransactionCount(
  periodStart: number,
  periodEnd: number,
) {
  const numProcessedTransactions = await analysisDb
    .select({
      count: count(analysisSchema.processedTransactions.id),
    })
    .from(analysisSchema.processedTransactions)
    .where(
      and(
        gt(
          analysisSchema.processedTransactions.timestamp,
          new Date(periodStart),
        ),
        lt(analysisSchema.processedTransactions.timestamp, new Date(periodEnd)),
      ),
    );

  return numProcessedTransactions.pop()!.count;
}

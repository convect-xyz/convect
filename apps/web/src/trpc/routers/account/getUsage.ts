import { analysisSchema } from "@convect-xyz/lib";
import { and, count, gt, lt, sql } from "drizzle-orm";
import { z } from "zod";
import {
  gbHoursProduct,
  invocationsProduct,
  processedTransactionsProduct,
} from "~/lib/server/products";
import { Product } from "~/lib/server/products/product";
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
    z.array(
      z.object({
        key: z.enum(["processedTransactions", "gbHours", "invocations"]),
        name: z.string(),
        totalUsage: z.number(),
        includedFree: z.number(),
        additionalChargeInCents: z.number(),
        includedFreeUsageAsFraction: z.number(),
        unitSymbol: z.string(),
      }),
    ),
  )
  .query(async ({ input }) => {
    const { periodStart, periodEnd } = input;

    const [numProcessedTransactions, { gbHours, numInvocations }] =
      await Promise.all([
        getProcessedTransactionCount(periodStart, periodEnd),
        getGbHours(periodStart, periodEnd),
      ]);

    const getResponseForProduct = (product: Product, totalUsage: number) => {
      return {
        key: product.key,
        name: product.name,
        totalUsage,
        includedFree: product.getIncludedFree("free"),
        additionalChargeInCents: product.getAdditionalChargeInCents(
          totalUsage,
          "free",
        ),
        includedFreeUsageAsFraction: product.getIncludedFreeUsageAsFraction(
          totalUsage,
          "free",
        ),
        unitSymbol: product.unitSymbol,
      };
    };

    return [
      getResponseForProduct(invocationsProduct, numInvocations),
      getResponseForProduct(gbHoursProduct, gbHours),
      getResponseForProduct(
        processedTransactionsProduct,
        numProcessedTransactions,
      ),
    ].sort((a, b) => b.additionalChargeInCents - a.additionalChargeInCents);
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

async function getGbHours(periodStart: number, periodEnd: number) {
  const gbHours = await analysisDb
    .select({
      gbHour:
        sql<string>`SUM((billed_duration_ms / 1000.0) * (memory_size_mb / 1024.0))`.as(
          "gbHour",
        ),
      numInvocations: count(analysisSchema.reportedMetrics.id),
    })
    .from(analysisSchema.reportedMetrics)
    .where(
      and(
        gt(analysisSchema.reportedMetrics.timestamp, new Date(periodStart)),
        lt(analysisSchema.reportedMetrics.timestamp, new Date(periodEnd)),
      ),
    );
  const result = gbHours.pop()!;

  return {
    gbHours: Number(result.gbHour),
    numInvocations: result.numInvocations,
  };
}

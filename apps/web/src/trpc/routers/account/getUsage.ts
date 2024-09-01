import { analysisSchema } from "@convect-xyz/lib";
import { TRPCError } from "@trpc/server";
import { and, count, eq, gt, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { availebleProducts, planLoader, Product } from "~/lib/server/products";
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
        key: z.nativeEnum(availebleProducts),
        name: z.string(),
        totalUsage: z.number(),
        includedFree: z.number(),
        additionalChargeInCents: z.number(),
        includedFreeUsageAsFraction: z.number(),
        unitSymbol: z.string(),
      }),
    ),
  )
  .query(async ({ ctx, input }) => {
    const { periodStart, periodEnd } = input;

    const [numProcessedTransactions, { gbHours, numInvocations }] =
      await Promise.all([
        getProcessedTransactionCount(
          ctx.session.user.id,
          periodStart,
          periodEnd,
        ),
        getGbHours(ctx.session.user.id, periodStart, periodEnd),
      ]);

    const user = await ctx.db.query.users.findFirst({
      where(fields, { eq }) {
        return eq(fields.id, ctx.session.user.id);
      },
    });
    if (!user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const getResponseForProduct = (product: Product, totalUsage: number) => {
      return {
        key: product.key,
        name: product.name,
        totalUsage,
        includedFree: product.includedFree,
        additionalChargeInCents: product.getAdditionalChargeInCents(totalUsage),
        includedFreeUsageAsFraction:
          product.getIncludedFreeUsageAsFraction(totalUsage),
        unitSymbol: product.unitSymbol,
      };
    };

    const plan = await planLoader.loadForUser(user);
    return [numProcessedTransactions, gbHours, numInvocations]
      .map((usage) => {
        const product = plan.products.find((p) => p.key === usage.key)!;
        return getResponseForProduct(product, usage.usage);
      })
      .sort((a, b) => b.additionalChargeInCents - a.additionalChargeInCents);
  });

async function getProcessedTransactionCount(
  userId: string,
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
        eq(analysisSchema.processedTransactions.userId, userId),
      ),
    );

  return {
    key: availebleProducts.processedTransactions,
    usage: numProcessedTransactions.pop()!.count,
  } as const;
}

async function getGbHours(
  userId: string,
  periodStart: number,
  periodEnd: number,
) {
  const gbHours = await analysisDb
    .select({
      gbHour:
        sql<string>`SUM((billed_duration_ms / 3600000.0) * (memory_size_mb / 1024.0))`.as(
          "gbHour",
        ),
      numInvocations: count(analysisSchema.reportedMetrics.id),
    })
    .from(analysisSchema.reportedMetrics)
    .where(
      and(
        gt(analysisSchema.reportedMetrics.timestamp, new Date(periodStart)),
        lt(analysisSchema.reportedMetrics.timestamp, new Date(periodEnd)),
        eq(analysisSchema.reportedMetrics.userId, userId),
      ),
    );
  const result = gbHours.pop()!;

  return {
    gbHours: {
      key: availebleProducts.gbHours,
      usage: Number(result.gbHour),
    },
    numInvocations: {
      key: availebleProducts.invocations,
      usage: result.numInvocations,
    },
  } as const;
}

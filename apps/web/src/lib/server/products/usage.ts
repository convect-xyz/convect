import { analysisSchema, schema } from "@convect-xyz/server";
import { endOfMonth, startOfMonth } from "date-fns";
import { and, count, eq, gt, lt, sql } from "drizzle-orm";
import { cache } from "react";
import { db } from "~/server/db";
import { analysisDb } from "~/server/db/analysis";
import { availableProducts } from "./products";

export type UsageOptions = {
  projectId: number;
  periodStart: number;
  periodEnd: number;
};

export type UsageFn = (options: UsageOptions) => Promise<{
  key: keyof typeof availableProducts;
  usage: number;
}>;

const getGbHoursAndInvocations = cache(
  async (projectId: number, periodStart: number, periodEnd: number) => {
    return analysisDb
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
          eq(analysisSchema.reportedMetrics.projectId, projectId),
        ),
      );
  },
);

export const _usage: Record<
  keyof typeof availableProducts,
  (options: UsageOptions) => Promise<number>
> = {
  convectFunctions: async ({ projectId, periodStart, periodEnd }) => {
    const functions = await db
      .select({
        count: count(schema.convectFunctions.id),
      })
      .from(schema.convectFunctions)
      .where(eq(schema.convectFunctions.projectId, projectId));
    return functions[0]?.count ?? 0;
  },
  processedTransactions: async ({ projectId, periodStart, periodEnd }) => {
    const numProcessedTransactions = await analysisDb
      .select({
        count: count(analysisSchema.ethTransaction.id),
      })
      .from(analysisSchema.ethTransaction)
      .where(
        and(
          gt(analysisSchema.ethTransaction.createdAt, new Date(periodStart)),
          lt(analysisSchema.ethTransaction.createdAt, new Date(periodEnd)),
          eq(analysisSchema.ethTransaction.projectId, projectId),
        ),
      );

    return numProcessedTransactions[0]?.count ?? 0;
  },
  gbHours: async ({ projectId, periodStart, periodEnd }) => {
    const gbHours = await getGbHoursAndInvocations(
      projectId,
      periodStart,
      periodEnd,
    );
    const result = gbHours.pop()!;

    return Number(result.gbHour);
  },
  invocations: async ({ projectId, periodStart, periodEnd }) => {
    const invocations = await getGbHoursAndInvocations(
      projectId,
      periodStart,
      periodEnd,
    );
    const result = invocations.pop()!;
    return result.numInvocations;
  },
  basePlan: async (_) => {
    return 1;
  },
};

export const usage = new Proxy(
  {} as Record<keyof typeof availableProducts, UsageFn>,
  {
    get(_, prop) {
      const fn = _usage[prop as keyof typeof _usage];
      return (async (options: UsageOptions) => {
        if (!fn) {
          throw new Error(`Usage function ${String(prop)} not found`);
        }
        return {
          key: prop as keyof typeof availableProducts,
          usage: await fn(options),
        };
      }) as UsageFn;
    },
  },
);

export const currentMonthUsage = new Proxy(
  {} as Record<
    keyof typeof availableProducts,
    (projectId: number) => ReturnType<UsageFn>
  >,
  {
    get(_, prop) {
      const fn = usage[prop as keyof typeof _usage];
      return (projectId: number) =>
        fn({
          projectId,
          periodStart: startOfMonth(new Date()).getTime(),
          periodEnd: endOfMonth(new Date()).getTime(),
        });
    },
  },
);

import { analysisSchema } from "@convect-xyz/server";
import { TRPCError } from "@trpc/server";
import {
  and,
  arrayOverlaps,
  desc,
  eq,
  ilike,
  lt,
  max,
  or,
  sql,
  SQLWrapper,
} from "drizzle-orm";
import { z } from "zod";
import { analysisDb } from "~/server/db/analysis";
import { protectedProcedure } from "~/trpc/trpc";
import { throwIfNotProjectCollaborator } from "../permissions";

export const explainAnalyze = async <T extends SQLWrapper>(
  db: typeof analysisDb,
  query: T,
) => {
  const debugResult = await db.execute(sql`EXPLAIN ANALYZE ${query.getSQL()}`);
  console.debug(debugResult);
  return await query;
};

export const getTransactions = protectedProcedure
  .input(
    z.object({
      limit: z.number().min(1).max(25).default(25),
      cursor: z.number().nullish(),
      search: z.string().nullish(),
      status: z.array(z.enum(["FAILED", "SUCCESS", "PENDING"])).default([]),
      batchId: z.string().nullish(),
      functionId: z.number(),
      chainId: z.number(),
      deploymentId: z.string(),
      txConfigs: z.array(z.number()).default([]),
    }),
  )
  .output(
    z.object({
      transactions: z.array(
        z.object({
          id: z.number(),
          transactionHash: z.string(),
          timestamp: z.number(),
          txConfigs: z.array(z.number()),
          result: z
            .object({
              successCount: z.number(),
              status: z.enum(["SUCCESS", "FAILED"]),
            })
            .optional(),
        }),
      ),
      nextCursor: z.number().optional(),
    }),
  )
  .query(async (opts) => {
    const { input, ctx } = opts;

    const fn = await ctx.db.query.convectFunctions.findFirst({
      where(fields, { eq }) {
        return eq(fields.id, input.functionId);
      },
    });
    if (!fn) {
      throw new TRPCError({ message: "Handler not found", code: "NOT_FOUND" });
    }

    await throwIfNotProjectCollaborator({
      projectId: fn.projectId,
      userId: ctx.session.user.id,
    });

    const getFilter = () => {
      let baseFilter = and(
        eq(analysisSchema.ethTransaction.deploymentId, input.deploymentId),
        eq(
          analysisSchema.ethTransaction.functionId,
          input.functionId.toString(),
        ),
        eq(analysisSchema.ethTransaction.chainId, input.chainId),
      );
      if (input.search) {
        baseFilter = and(
          baseFilter,
          ilike(
            analysisSchema.ethTransaction.transactionHash,
            `%${input.search}%`,
          ),
        );
      }
      if (input.cursor) {
        baseFilter = and(
          baseFilter,
          lt(analysisSchema.ethTransaction.id, input.cursor),
        );
      }
      if (input.status.length > 0) {
        const statusFilter = input.status.map((status) =>
          eq(txCounts.status, status),
        );
        baseFilter = and(baseFilter, or(...statusFilter));
      }
      if (input.batchId) {
        baseFilter = and(
          baseFilter,
          eq(analysisSchema.ethTransaction.batchId, input.batchId),
        );
      }
      if (input.txConfigs.length > 0) {
        baseFilter = and(
          baseFilter,
          arrayOverlaps(
            analysisSchema.ethTransaction.txConfigs,
            input.txConfigs.map((txConfig) => txConfig),
          ),
        );
      }
      return baseFilter;
    };

    const latestBatchIds = analysisDb
      .selectDistinctOn([analysisSchema.processedBatch.batchId], {
        batchId: analysisSchema.processedBatch.batchId,
        id: analysisSchema.processedBatch.id,
      })
      .from(analysisSchema.processedBatch)
      .where(
        and(
          eq(analysisSchema.processedBatch.deploymentId, input.deploymentId),
          eq(
            analysisSchema.processedBatch.functionId,
            input.functionId.toString(),
          ),
          eq(analysisSchema.processedBatch.chainId, input.chainId),
        ),
      )
      .orderBy(
        desc(analysisSchema.processedBatch.batchId),
        desc(analysisSchema.processedBatch.timestamp),
      )
      .as("latestBatchIds");

    const txCounts = analysisDb
      .select({
        transactionHash: analysisSchema.processedTransaction.transactionHash,
        timestamp: max(analysisSchema.processedTransaction.timestamp),
        status:
          sql<string>`CASE WHEN BOOL_AND(${analysisSchema.processedTransaction.status} = 'SUCCESS') THEN 'SUCCESS' ELSE 'FAILED' END`.as(
            "status",
          ),
        successCount:
          sql<number>`CAST(SUM(CASE WHEN ${analysisSchema.processedTransaction.status} = 'SUCCESS' THEN 1 ELSE 0 END) AS INT)`.as(
            "successCount",
          ),
      })
      .from(analysisSchema.processedTransaction)
      .innerJoin(
        latestBatchIds,
        eq(
          analysisSchema.processedTransaction.processedBatchId,
          latestBatchIds.id,
        ),
      )
      .where(
        and(
          eq(
            analysisSchema.processedTransaction.deploymentId,
            input.deploymentId,
          ),
          eq(
            analysisSchema.processedTransaction.functionId,
            input.functionId.toString(),
          ),
          eq(analysisSchema.processedTransaction.chainId, input.chainId),
        ),
      )
      .groupBy(analysisSchema.processedTransaction.transactionHash)
      .as("txCounts");

    const recentTransactions = await explainAnalyze(
      analysisDb,
      analysisDb
        .select({
          id: analysisSchema.ethTransaction.id,
          transactionHash: analysisSchema.ethTransaction.transactionHash,
          createdAt: analysisSchema.ethTransaction.createdAt,
          functionId: analysisSchema.ethTransaction.functionId,
          deploymentId: analysisSchema.ethTransaction.deploymentId,
          txConfigs: analysisSchema.ethTransaction.txConfigs,
          status: txCounts.status,
          successCount: txCounts.successCount,
        })
        .from(analysisSchema.ethTransaction)
        .leftJoin(
          txCounts,
          eq(
            txCounts.transactionHash,
            analysisSchema.ethTransaction.transactionHash,
          ),
        )
        .orderBy(
          desc(analysisSchema.ethTransaction.id),
          desc(analysisSchema.ethTransaction.createdAt),
        )
        .where(getFilter())
        .limit(input.limit + 1),
    );

    return {
      transactions: recentTransactions.map((tx) => ({
        id: tx.id,
        transactionHash: tx.transactionHash,
        timestamp: tx.createdAt.getTime(),
        txConfigs: tx.txConfigs ?? [],
        result: tx.status
          ? {
              status: tx.status as "SUCCESS" | "FAILED",
              successCount: tx.successCount,
            }
          : undefined,
      })),
      nextCursor: recentTransactions.at(-1)?.id,
    };
  });

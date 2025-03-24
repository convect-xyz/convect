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

    const recentTransactions = analysisDb
      .select({
        id: analysisSchema.ethTransaction.id,
        transactionHash: analysisSchema.ethTransaction.transactionHash,
        createdAt: analysisSchema.ethTransaction.createdAt,
        functionId: analysisSchema.ethTransaction.functionId,
        deploymentId: analysisSchema.ethTransaction.deploymentId,
        txConfigs: analysisSchema.ethTransaction.txConfigs,
      })
      .from(analysisSchema.ethTransaction)
      .orderBy(
        desc(analysisSchema.ethTransaction.id),
        desc(analysisSchema.ethTransaction.createdAt),
      )
      .where(getFilter())
      .limit(input.limit + 1)
      .as("recentTransactions");

    const processedTransactions = analysisDb
      .select({
        ethTransactionId: recentTransactions.id,
        timestamp: analysisSchema.processedTransaction.timestamp,
        processedBatchId: analysisSchema.processedTransaction.processedBatchId,
        transactionHash: recentTransactions.transactionHash,
        status: analysisSchema.processedTransaction.status,
        txConfigs: recentTransactions.txConfigs,
        deploymentId: analysisSchema.processedTransaction.deploymentId,
        functionId: analysisSchema.processedTransaction.functionId,
        chainId: analysisSchema.processedTransaction.chainId,
        createdAt: recentTransactions.createdAt,
      })
      .from(analysisSchema.processedTransaction)
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
      .rightJoin(
        recentTransactions,
        eq(
          analysisSchema.processedTransaction.transactionHash,
          recentTransactions.transactionHash,
        ),
      )
      .as("processedTransactions");

    const processedTransactionsWithBatch = analysisDb
      .select({
        ethTransactionId: processedTransactions.ethTransactionId,
        timestamp: processedTransactions.timestamp,
        batchId: analysisSchema.processedBatch.batchId,
        processedBatchId: processedTransactions.processedBatchId,
        transactionHash: processedTransactions.transactionHash,
        status: processedTransactions.status,
        txConfigs: processedTransactions.txConfigs,
        createdAt: processedTransactions.createdAt,
      })
      .from(processedTransactions)
      .where(
        and(
          eq(processedTransactions.deploymentId, input.deploymentId),
          eq(processedTransactions.functionId, input.functionId.toString()),
          eq(processedTransactions.chainId, input.chainId),
        ),
      )
      .leftJoin(
        analysisSchema.processedBatch,
        and(
          eq(
            analysisSchema.processedBatch.id,
            processedTransactions.processedBatchId,
          ),
          eq(
            analysisSchema.processedBatch.deploymentId,
            processedTransactions.deploymentId,
          ),
          eq(
            analysisSchema.processedBatch.functionId,
            processedTransactions.functionId,
          ),
          eq(
            analysisSchema.processedBatch.chainId,
            processedTransactions.chainId,
          ),
        ),
      )
      .as("processedTransactionsWithBatch");

    const aggregatedStats = analysisDb
      .select({
        ethTransactionId: processedTransactionsWithBatch.ethTransactionId,
        processedBatchId: processedTransactionsWithBatch.processedBatchId,
        batchId: processedTransactionsWithBatch.batchId,
        timestamp: max(processedTransactionsWithBatch.timestamp).as(
          "txCountsTimestamp",
        ),
        transactionHash: processedTransactionsWithBatch.transactionHash,
        txConfigs: processedTransactionsWithBatch.txConfigs,
        status:
          sql<string>`CASE WHEN BOOL_AND(${processedTransactionsWithBatch.status} = 'SUCCESS') THEN 'SUCCESS' ELSE 'FAILED' END`.as(
            "status",
          ),
        successCount:
          sql<number>`CAST(SUM(CASE WHEN ${processedTransactionsWithBatch.status} = 'SUCCESS' THEN 1 ELSE 0 END) AS INT)`.as(
            "successCount",
          ),
        createdAt: processedTransactionsWithBatch.createdAt,
      })
      .from(processedTransactionsWithBatch)
      .groupBy(
        processedTransactionsWithBatch.transactionHash,
        processedTransactionsWithBatch.batchId,
        processedTransactionsWithBatch.processedBatchId,
        processedTransactionsWithBatch.ethTransactionId,
        processedTransactionsWithBatch.createdAt,
        processedTransactionsWithBatch.txConfigs,
      )
      .as("txCounts");

    const results = await explainAnalyze(
      analysisDb,
      analysisDb
        .selectDistinctOn(
          [aggregatedStats.batchId, aggregatedStats.transactionHash],
          {
            ethTransactionId: aggregatedStats.ethTransactionId,
            transactionHash: aggregatedStats.transactionHash,
            status: aggregatedStats.status,
            successCount: aggregatedStats.successCount,
            timestamp: aggregatedStats.timestamp,
            txConfigs: aggregatedStats.txConfigs,
            createdAt: aggregatedStats.createdAt,
          },
        )
        .from(aggregatedStats)
        .orderBy(
          desc(aggregatedStats.batchId),
          desc(aggregatedStats.transactionHash),
          desc(aggregatedStats.timestamp),
        ),
    );

    return {
      transactions: results.map((tx) => ({
        id: tx.ethTransactionId,
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
      nextCursor: results.at(-1)?.ethTransactionId,
    };
  });

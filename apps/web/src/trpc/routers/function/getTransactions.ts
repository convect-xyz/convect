import { analysisSchema } from "@convect-xyz/server";
import { TRPCError } from "@trpc/server";
import {
  and,
  arrayOverlaps,
  desc,
  eq,
  ilike,
  inArray,
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
      if (input.status.length > 0) {
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
        })
        .from(analysisSchema.ethTransaction)
        .orderBy(
          desc(analysisSchema.ethTransaction.id),
          desc(analysisSchema.ethTransaction.createdAt),
        )
        .where(getFilter())
        .limit(input.limit + 1),
    );

    const processedTransactions = analysisDb
      .select({
        timestamp: analysisSchema.processedTransaction.timestamp,
        batchId: analysisSchema.processedBatch.batchId,
        processedBatchId: analysisSchema.processedTransaction.processedBatchId,
        transactionHash: analysisSchema.processedTransaction.transactionHash,
        status: analysisSchema.processedTransaction.status,
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
          inArray(
            analysisSchema.processedTransaction.transactionHash,
            recentTransactions.map((tx) => tx.transactionHash),
          ),
        ),
      )
      .leftJoin(
        analysisSchema.processedBatch,
        and(
          eq(
            analysisSchema.processedBatch.id,
            analysisSchema.processedTransaction.processedBatchId,
          ),
          eq(
            analysisSchema.processedBatch.deploymentId,
            analysisSchema.processedTransaction.deploymentId,
          ),
          eq(
            analysisSchema.processedBatch.functionId,
            analysisSchema.processedTransaction.functionId,
          ),
          eq(
            analysisSchema.processedBatch.chainId,
            analysisSchema.processedTransaction.chainId,
          ),
        ),
      )
      .as("processedTransactions");

    const txCounts = analysisDb
      .select({
        processedBatchId: processedTransactions.processedBatchId,
        batchId: processedTransactions.batchId,
        timestamp: max(processedTransactions.timestamp).as("txCountsTimestamp"),
        transactionHash: processedTransactions.transactionHash,
        status:
          sql<string>`CASE WHEN BOOL_AND(${processedTransactions.status} = 'SUCCESS') THEN 'SUCCESS' ELSE 'FAILED' END`.as(
            "status",
          ),
        successCount:
          sql<number>`CAST(SUM(CASE WHEN ${processedTransactions.status} = 'SUCCESS' THEN 1 ELSE 0 END) AS INT)`.as(
            "successCount",
          ),
      })
      .from(processedTransactions)
      .groupBy(
        processedTransactions.transactionHash,
        processedTransactions.batchId,
        processedTransactions.processedBatchId,
      )
      .as("txCounts");

    const txStats =
      recentTransactions.length > 0
        ? await explainAnalyze(
            analysisDb,
            analysisDb
              .selectDistinctOn([txCounts.batchId, txCounts.transactionHash], {
                transactionHash: txCounts.transactionHash,
                status: txCounts.status,
                successCount: txCounts.successCount,
              })
              .from(txCounts)
              .orderBy(
                desc(txCounts.batchId),
                desc(txCounts.transactionHash),
                desc(txCounts.timestamp),
              ),
          )
        : [];

    console.log(txStats);
    const a = (tx: string) => {
      return txStats.find((t) => t.transactionHash === tx);
    };

    return {
      transactions: recentTransactions.map((tx) => ({
        id: tx.id,
        transactionHash: tx.transactionHash,
        timestamp: tx.createdAt.getTime(),
        txConfigs: tx.txConfigs ?? [],
        result: a(tx.transactionHash)
          ? {
              status: a(tx.transactionHash)!.status as "SUCCESS" | "FAILED",
              successCount: a(tx.transactionHash)!.successCount,
            }
          : undefined,
      })),
      nextCursor: recentTransactions.at(-1)?.id,
    };
  });

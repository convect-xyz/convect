import { analysisSchema } from "@convect-xyz/server";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, gt, isNull, max, sql } from "drizzle-orm";
import { z } from "zod";
import { analysisDb } from "~/server/db/analysis";
import { protectedProcedure } from "~/trpc/trpc";
import { throwIfNotProjectCollaborator } from "../permissions";

export const getTransaction = protectedProcedure
  .input(
    z.object({
      deploymentId: z.string(),
      functionId: z.number(),
      chainId: z.number(),
      transactionHash: z.string(),
    }),
  )
  .output(
    z.object({
      transaction: z.object({
        id: z.number(),
        transactionHash: z.string(),
        timestamp: z.number(),
        txConfigs: z.array(z.number()),
        result: z
          .object({
            successCount: z.number(),
            status: z
              .object({
                status: z.literal("SUCCESS"),
              })
              .or(
                z.object({
                  status: z.literal("FAILED"),
                  message: z.string(),
                  stacktrace: z.string(),
                }),
              ),
          })
          .optional(),
        mostRecentAttempts: z.array(
          z.object({
            handler: z.string(),
            status: z.enum(["SUCCESS", "FAILED"]),
            timestamp: z.number(),
          }),
        ),
      }),
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
        eq(
          analysisSchema.ethTransaction.transactionHash,
          input.transactionHash,
        ),
      );

      return baseFilter;
    };

    const transaction = await analysisDb
      .select({
        id: analysisSchema.ethTransaction.id,
        transactionHash: analysisSchema.ethTransaction.transactionHash,
        createdAt: analysisSchema.ethTransaction.createdAt,
        functionId: analysisSchema.ethTransaction.functionId,
        deploymentId: analysisSchema.ethTransaction.deploymentId,
        txConfigs: analysisSchema.ethTransaction.txConfigs,
      })
      .from(analysisSchema.ethTransaction)
      .where(getFilter())
      .limit(1);

    const processedTransactions = analysisDb
      .select({
        timestamp: analysisSchema.processedTransaction.timestamp,
        batchId: analysisSchema.processedBatch.batchId,
        processedBatchId: analysisSchema.processedTransaction.processedBatchId,
        transactionHash: analysisSchema.processedTransaction.transactionHash,
        status: analysisSchema.processedTransaction.status,
        errorMessage: analysisSchema.processedBatch.errorMessage,
        errorStacktrace: analysisSchema.processedBatch.errorStacktrace,
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
          eq(
            analysisSchema.processedTransaction.transactionHash,

            input.transactionHash,
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
        errorMessage: processedTransactions.errorMessage,
        errorStacktrace: processedTransactions.errorStacktrace,
        status: sql<
          "SUCCESS" | "FAILED"
        >`CASE WHEN BOOL_AND(${processedTransactions.status} = 'SUCCESS') THEN 'SUCCESS' ELSE 'FAILED' END`.as(
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
        processedTransactions.errorMessage,
        processedTransactions.errorStacktrace,
      )
      .as("txCounts");

    const txStats = await analysisDb
      .selectDistinctOn([txCounts.batchId, txCounts.transactionHash], {
        transactionHash: txCounts.transactionHash,
        status: txCounts.status,
        successCount: txCounts.successCount,
        errorMessage: txCounts.errorMessage,
        errorStacktrace: txCounts.errorStacktrace,
      })
      .from(txCounts)
      .orderBy(
        desc(txCounts.batchId),
        desc(txCounts.transactionHash),
        desc(txCounts.timestamp),
      );

    const stat = txStats[0];

    const mostRecentAttempts = await getMostRecentAttempts({
      transactionHash: input.transactionHash,
      functionId: input.functionId,
      chainId: input.chainId,
      deploymentId: input.deploymentId,
    });

    const tx = transaction[0];
    if (!tx) {
      throw new TRPCError({
        message: "Transaction not found",
        code: "NOT_FOUND",
      });
    }

    return {
      transaction: {
        id: tx.id,
        transactionHash: tx.transactionHash,
        timestamp: tx.createdAt.getTime(),
        txConfigs: tx.txConfigs ?? [],
        result: stat
          ? {
              status:
                stat.status === "SUCCESS"
                  ? {
                      status: "SUCCESS",
                    }
                  : {
                      status: "FAILED",
                      message: stat.errorMessage ?? "",
                      stacktrace: stat.errorStacktrace ?? "",
                    },
              successCount: stat.successCount,
            }
          : undefined,
        mostRecentAttempts: mostRecentAttempts.map((attempt) => ({
          handler: attempt.handler,
          status: attempt.status as "SUCCESS" | "FAILED",
          timestamp: attempt.mostRecentAttemptTimestamp.getTime(),
        })),
      },
    };
  });

async function getMostRecentAttempts(opts: {
  transactionHash: string;
  functionId: number;
  chainId: number;
  deploymentId: string;
}) {
  const other = analysisDb
    .select({
      id: analysisSchema.processedTransaction.id,
      timestamp: analysisSchema.processedTransaction.timestamp,
    })
    .from(analysisSchema.processedTransaction)
    .where(
      and(
        eq(
          analysisSchema.processedTransaction.transactionHash,
          opts.transactionHash,
        ),
        eq(
          analysisSchema.processedTransaction.functionId,
          opts.functionId.toString(),
        ),
        eq(analysisSchema.processedTransaction.chainId, opts.chainId),
        eq(analysisSchema.processedTransaction.deploymentId, opts.deploymentId),
      ),
    )
    .as("other");

  return analysisDb
    .select({
      id: analysisSchema.processedTransaction.id,
      mostRecentAttemptTimestamp: analysisSchema.processedTransaction.timestamp,
      status: analysisSchema.processedTransaction.status,
      handler: analysisSchema.processedTransaction.handler,
    })
    .from(analysisSchema.processedTransaction)
    .leftJoin(
      other,
      and(
        eq(analysisSchema.processedTransaction.id, other.id),
        gt(analysisSchema.processedTransaction.timestamp, other.timestamp),
      ),
    )
    .where(
      and(
        eq(
          analysisSchema.processedTransaction.transactionHash,
          opts.transactionHash,
        ),
        eq(
          analysisSchema.processedTransaction.functionId,
          opts.functionId.toString(),
        ),
        eq(analysisSchema.processedTransaction.chainId, opts.chainId),
        eq(analysisSchema.processedTransaction.deploymentId, opts.deploymentId),
        isNull(other.id),
      ),
    );
}

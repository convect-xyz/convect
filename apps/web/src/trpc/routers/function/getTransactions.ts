import { analysisSchema } from "@convect-xyz/server";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, ilike, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { analysisDb } from "~/server/db/analysis";
import { protectedProcedure } from "~/trpc/trpc";
import { throwIfNotProjectCollaborator } from "../permissions";

export const getTransactions = protectedProcedure
  .input(
    z.object({
      limit: z.number().min(1).max(25).default(25),
      cursor: z.number().nullish(),
      search: z.string().nullish(),
      status: z.enum(["FAILED", "SUCCESS"]).nullish(),
      functionId: z.number(),
      chainId: z.number(),
      deploymentId: z.string(),
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
      return baseFilter;
    };

    const txCounts = analysisDb
      .select({
        transactionHash: analysisSchema.processedTransaction.transactionHash,
        processedBatchId: analysisSchema.processedTransaction.processedBatchId,
        functionId: analysisSchema.processedTransaction.functionId,
        chainId: analysisSchema.processedTransaction.chainId,
        deploymentId: analysisSchema.processedTransaction.deploymentId,
        successCount:
          sql<number>`CAST(SUM(CASE WHEN ${analysisSchema.processedTransaction.status} = 'SUCCESS' THEN 1 ELSE 0 END) AS INT)`.as(
            "successCount",
          ),
        status:
          sql<string>`CASE WHEN BOOL_AND(${analysisSchema.processedTransaction.status} = 'SUCCESS') THEN 'SUCCESS' ELSE 'FAILED' END`.as(
            "txStatus",
          ),
      })
      .from(analysisSchema.processedTransaction)
      .leftJoin(
        analysisSchema.processedBatch,
        eq(
          analysisSchema.processedBatch.id,
          analysisSchema.processedTransaction.processedBatchId,
        ),
      )
      .groupBy(
        analysisSchema.processedTransaction.transactionHash,
        analysisSchema.processedTransaction.deploymentId,
        analysisSchema.processedTransaction.functionId,
        analysisSchema.processedTransaction.chainId,
        analysisSchema.processedTransaction.processedBatchId,
      )
      .as("txCounts");

    const processedTransactions = analysisDb
      .select({
        transactionHash: analysisSchema.processedTransaction.transactionHash,
        functionId: analysisSchema.processedTransaction.functionId,
        chainId: analysisSchema.processedTransaction.chainId,
        deploymentId: analysisSchema.processedTransaction.deploymentId,
        processedBatchId: analysisSchema.processedTransaction.processedBatchId,
        successCount: sql<number>`COALESCE(${txCounts.successCount}, 0)`.as(
          "successCount",
        ),
        status: txCounts.status,
        timestamp: analysisSchema.processedTransaction.timestamp,
      })
      .from(analysisSchema.processedTransaction)
      .leftJoin(
        txCounts,
        and(
          eq(
            txCounts.transactionHash,
            analysisSchema.processedTransaction.transactionHash,
          ),
          eq(
            txCounts.functionId,
            analysisSchema.processedTransaction.functionId,
          ),
          eq(txCounts.chainId, analysisSchema.processedTransaction.chainId),
          eq(
            txCounts.deploymentId,
            analysisSchema.processedTransaction.deploymentId,
          ),
          eq(
            txCounts.processedBatchId,
            analysisSchema.processedTransaction.processedBatchId,
          ),
        ),
      )
      .as("processedTransactions");

    const recentTransactions = await analysisDb
      .selectDistinctOn([analysisSchema.ethTransaction.id], {
        id: analysisSchema.ethTransaction.id,
        transactionHash: analysisSchema.ethTransaction.transactionHash,
        createdAt: analysisSchema.ethTransaction.createdAt,
        functionId: analysisSchema.ethTransaction.functionId,
        deploymentId: analysisSchema.ethTransaction.deploymentId,
        successCount: sql<number>`COALESCE(${txCounts.successCount}, 0)`.as(
          "successCount",
        ),
        txConfigs: analysisSchema.ethTransaction.txConfigs,
        status: processedTransactions.status,
      })
      .from(analysisSchema.ethTransaction)
      .leftJoin(
        processedTransactions,
        and(
          eq(
            processedTransactions.transactionHash,
            analysisSchema.ethTransaction.transactionHash,
          ),
          eq(
            processedTransactions.functionId,
            analysisSchema.ethTransaction.functionId,
          ),
          eq(
            processedTransactions.chainId,
            analysisSchema.ethTransaction.chainId,
          ),
          eq(
            processedTransactions.deploymentId,
            analysisSchema.ethTransaction.deploymentId,
          ),
        ),
      )
      .where(getFilter())
      .orderBy(
        desc(analysisSchema.ethTransaction.id),
        desc(processedTransactions.timestamp),
      )
      .limit(input.limit + 1);

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

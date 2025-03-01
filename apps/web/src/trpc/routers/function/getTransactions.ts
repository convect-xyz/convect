import { analysisSchema } from "@convect-xyz/server";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gte, ilike, sql } from "drizzle-orm";
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
          id: z.string(),
          transactionHash: z.string(),
          status: z.enum(["SUCCESS", "FAILED"]),
          successCount: z.number(),
          failureCount: z.number(),
          timestamp: z.number(),
        }),
      ),
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
        eq(analysisSchema.ethTransactions.deploymentId, input.deploymentId),
        eq(
          analysisSchema.ethTransactions.functionId,
          input.functionId.toString(),
        ),
        eq(analysisSchema.ethTransactions.chainId, input.chainId),
      );
      if (input.search) {
        baseFilter = and(
          baseFilter,
          ilike(
            analysisSchema.ethTransactions.transactionHash,
            `%${input.search}%`,
          ),
        );
      }
      if (input.cursor) {
        baseFilter = and(
          baseFilter,
          gte(analysisSchema.ethTransactions.id, input.cursor),
        );
      }
      return baseFilter;
    };

    const success = "SUCCESS";
    const failed = "FAILED";

    const txCounts = analysisDb
      .select({
        transactionHash: analysisSchema.ethProcessedResult.transactionHash,
        functionId: analysisSchema.ethProcessedResult.functionId,
        chainId: analysisSchema.ethProcessedResult.chainId,
        deploymentId: analysisSchema.ethProcessedResult.deploymentId,
        successCount:
          sql<number>`CAST(SUM(CASE WHEN ${analysisSchema.ethProcessedResult.status} = ${success} THEN 1 ELSE 0 END) AS INT)`.as(
            "successCount",
          ),
        failureCount:
          sql<number>`CAST(SUM(CASE WHEN ${analysisSchema.ethProcessedResult.status} = ${failed} THEN 1 ELSE 0 END) AS INT)`.as(
            "failureCount",
          ),
      })
      .from(analysisSchema.ethProcessedResult)
      .groupBy(
        analysisSchema.ethProcessedResult.transactionHash,
        analysisSchema.ethProcessedResult.deploymentId,
        analysisSchema.ethProcessedResult.functionId,
        analysisSchema.ethProcessedResult.chainId,
      )
      .as("txCounts");

    const recentTransactions = await analysisDb
      .select({
        transactionHash: analysisSchema.ethTransactions.transactionHash,
        createdAt: analysisSchema.ethTransactions.createdAt,
        functionId: analysisSchema.ethTransactions.functionId,
        deploymentId: analysisSchema.ethTransactions.deploymentId,
        successCount: txCounts.successCount,
        failureCount: txCounts.failureCount,
      })
      .from(analysisSchema.ethTransactions)
      .leftJoin(
        txCounts,
        and(
          eq(
            txCounts.transactionHash,
            analysisSchema.ethTransactions.transactionHash,
          ),
          eq(txCounts.functionId, analysisSchema.ethTransactions.functionId),
          eq(txCounts.chainId, analysisSchema.ethTransactions.chainId),
          eq(
            txCounts.deploymentId,
            analysisSchema.ethTransactions.deploymentId,
          ),
        ),
      )
      .where(getFilter())
      .orderBy(
        desc(analysisSchema.ethTransactions.createdAt),
        asc(analysisSchema.ethTransactions.id),
      )
      .limit(input.limit);

    console.log(recentTransactions);
    return {
      transactions: recentTransactions.map((tx) => ({
        id: `${tx.transactionHash}-${tx.functionId}-${tx.deploymentId}`,
        transactionHash: tx.transactionHash,
        status: "SUCCESS",
        timestamp: tx.createdAt.getTime(),
        successCount: tx.successCount,
        failureCount: tx.failureCount,
      })),
    };
  });

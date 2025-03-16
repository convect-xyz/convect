import { analysisSchema } from "@convect-xyz/server";
import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, lt, max, sql } from "drizzle-orm";
import { z } from "zod";
import { analysisDb } from "~/server/db/analysis";
import { protectedProcedure } from "~/trpc/trpc";
import { throwIfNotProjectCollaborator } from "../permissions";

export const getBatches = protectedProcedure
  .input(
    z.object({
      limit: z.number().min(1).max(25).default(25),
      cursor: z.number().nullish(),
      search: z.string().nullish(),
      functionId: z.number(),
      chainId: z.number(),
      deploymentId: z.string(),
    }),
  )
  .output(
    z.object({
      batches: z.array(
        z.object({
          id: z.number(),
          batchId: z.string(),
          numTransactions: z.number(),
          result: z
            .object({
              numAttempts: z.number(),
              status: z.enum(["SUCCESS", "FAILED"]),
              mostRecentAttemptTimestampMs: z.number(),
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
        eq(analysisSchema.batch.deploymentId, input.deploymentId),
        eq(analysisSchema.batch.functionId, input.functionId.toString()),
        eq(analysisSchema.batch.chainId, input.chainId),
      );
      if (input.cursor) {
        baseFilter = and(baseFilter, lt(analysisSchema.batch.id, input.cursor));
      }
      return baseFilter;
    };

    const txCounts = analysisDb
      .select({
        batchId: analysisSchema.ethTransaction.batchId,
        numTransactions: count(analysisSchema.ethTransaction.id).as(
          "numTransactions",
        ),
      })
      .from(analysisSchema.ethTransaction)
      .groupBy(analysisSchema.ethTransaction.batchId)
      .as("txCounts");

    const statusInfo = analysisDb
      .select({
        batchId: analysisSchema.processedBatch.batchId,
        numAttempts: count(analysisSchema.processedBatch.id).as("numAttempts"),
        status: sql<"SUCCESS" | "FAILED" | null>`CASE 
              WHEN BOOL_AND(${analysisSchema.processedBatch.status} = 'SUCCESS') THEN 'SUCCESS' 
              WHEN BOOL_OR(${analysisSchema.processedBatch.status} = 'FAILED') THEN 'FAILED' 
              ELSE NULL 
          END`.as("statusInfoStatus"),
        mostRecentAttemptTimestamp: max(
          analysisSchema.processedBatch.timestamp,
        ).as("mostRecentAttemptTimestamp"),
      })
      .from(analysisSchema.batch)
      .leftJoin(
        analysisSchema.processedBatch,
        eq(analysisSchema.batch.batchId, analysisSchema.processedBatch.batchId),
      )
      .groupBy(analysisSchema.processedBatch.batchId)
      .as("statusInfo");

    const recentBatches = await analysisDb
      .select({
        id: analysisSchema.batch.id,
        batchId: analysisSchema.batch.batchId,
        numTransactions: txCounts.numTransactions,
        status: statusInfo.status,
        mostRecentAttemptTimestamp: statusInfo.mostRecentAttemptTimestamp,
        numAttempts: statusInfo.numAttempts,
      })
      .from(analysisSchema.batch)
      .leftJoin(txCounts, eq(analysisSchema.batch.batchId, txCounts.batchId))
      .leftJoin(
        statusInfo,
        eq(analysisSchema.batch.batchId, statusInfo.batchId),
      )
      .where(getFilter())
      .orderBy(desc(analysisSchema.batch.id))
      .limit(input.limit + 1);

    return {
      batches: recentBatches.map((batch) => ({
        id: batch.id,
        batchId: batch.batchId,
        numTransactions: batch.numTransactions,
        result: batch.status
          ? {
              numAttempts: batch.numAttempts,
              status: batch.status,
              mostRecentAttemptTimestampMs:
                batch.mostRecentAttemptTimestamp!.getTime(),
            }
          : undefined,
      })),
      nextCursor: recentBatches.at(-1)?.id,
    };
  });

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

    const batches = analysisDb
      .select({
        id: analysisSchema.batch.id,
        batchId: analysisSchema.batch.batchId,
      })
      .from(analysisSchema.batch)
      .where(getFilter())
      .limit(input.limit + 1)
      .orderBy(desc(analysisSchema.batch.id))
      .as("batches");

    const aggregatedFetchStats = analysisDb
      .select({
        batchId: analysisSchema.ethTransaction.batchId,
        numTransactions: count(analysisSchema.ethTransaction.id).as(
          "numTransactions",
        ),
      })
      .from(analysisSchema.ethTransaction)
      .rightJoin(
        batches,
        eq(analysisSchema.ethTransaction.batchId, batches.batchId),
      )
      .where(
        and(
          eq(analysisSchema.ethTransaction.deploymentId, input.deploymentId),
          eq(
            analysisSchema.ethTransaction.functionId,
            input.functionId.toString(),
          ),
          eq(analysisSchema.ethTransaction.chainId, input.chainId),
        ),
      )
      .groupBy(analysisSchema.ethTransaction.batchId)
      .as("aggregatedFetchStats");

    const aggregatedProcessStats = analysisDb
      .select({
        batchId: analysisSchema.processedBatch.batchId,
        numAttempts: count(analysisSchema.processedBatch.id).as("numAttempts"),
        status: sql<"SUCCESS" | "FAILED" | null>`CASE 
              WHEN BOOL_OR(${analysisSchema.processedBatch.status} = 'SUCCESS') THEN 'SUCCESS' 
              WHEN BOOL_OR(${analysisSchema.processedBatch.status} = 'FAILED') THEN 'FAILED' 
              ELSE NULL 
          END`.as("statusInfoStatus"),
        mostRecentAttemptTimestamp: max(
          analysisSchema.processedBatch.timestamp,
        ).as("mostRecentAttemptTimestamp"),
      })
      .from(analysisSchema.processedBatch)
      .rightJoin(
        batches,
        eq(analysisSchema.processedBatch.batchId, batches.batchId),
      )
      .groupBy(analysisSchema.processedBatch.batchId)
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
      .as("aggregatedStats");

    const recentBatches = await analysisDb
      .select()
      .from(batches)
      .leftJoin(
        aggregatedFetchStats,
        eq(batches.batchId, aggregatedFetchStats.batchId),
      )
      .leftJoin(
        aggregatedProcessStats,
        eq(batches.batchId, aggregatedProcessStats.batchId),
      )
      .orderBy(desc(batches.id));

    return {
      batches: recentBatches.map((batch) => ({
        id: batch.batches.id,
        batchId: batch.batches.batchId,
        numTransactions: batch.aggregatedFetchStats?.numTransactions ?? 0,
        result: batch.aggregatedStats
          ? {
              numAttempts: batch.aggregatedStats.numAttempts,
              status: batch.aggregatedStats.status as "SUCCESS" | "FAILED",
              mostRecentAttemptTimestampMs:
                batch.aggregatedStats.mostRecentAttemptTimestamp!.getTime(),
            }
          : undefined,
      })),
      nextCursor: recentBatches.at(-1)?.batches.id,
    };
  });

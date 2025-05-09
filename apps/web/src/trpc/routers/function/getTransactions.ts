import { analysisSchema } from "@convect-xyz/server";
import { TRPCError } from "@trpc/server";
import {
  and,
  arrayContains,
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

const inputSchema = z.object({
  limit: z.number().min(1).max(25).default(25),
  cursor: z.number().nullish(),
  search: z.string().nullish(),
  status: z.array(z.enum(["FAILED", "SUCCESS", "PENDING"])).default([]),
  batchId: z.string().nullish(),
  functionId: z.number(),
  chainId: z.number(),
  deploymentId: z.string(),
  txConfigs: z.array(z.number()).default([]),
});

export const getTransactions = protectedProcedure
  .input(inputSchema)
  .output(
    z.object({
      transactions: z.array(
        z.object({
          id: z.number(),
          transactionHash: z.string(),
          timestamp: z.number(),
          txConfigs: z.array(z.number()),
          result: z.object({
            successCount: z.number(),
            status: z.enum(["SUCCESS", "FAILED", "PENDING"]),
          }),
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

    const ethTransactions = getEthTransactions(input);
    const processedTransactions = getProcessedTransactionsWithEthTransactions(
      input,
      ethTransactions,
    );
    const processedTransactionsWithBatch = getProcessedTransactionsWithBatch(
      input,
      processedTransactions,
    );
    const aggregatedStats = getAggregatedStats(
      input,
      processedTransactionsWithBatch,
    );

    const __results = analysisDb
      .selectDistinctOn([aggregatedStats.transactionHash], {
        ethTransactionId: aggregatedStats.ethTransactionId,
        transactionHash: aggregatedStats.transactionHash,
        status: aggregatedStats.status,
        successCount: aggregatedStats.successCount,
        timestamp: aggregatedStats.timestamp,
        txConfigs: aggregatedStats.txConfigs,
        createdAt: aggregatedStats.createdAt,
      })
      .from(aggregatedStats)
      .orderBy(
        desc(aggregatedStats.transactionHash),
        desc(aggregatedStats.timestamp),
      )
      .as("results");

    const results = await explainAnalyze(
      analysisDb,
      analysisDb
        .select()
        .from(__results)
        .orderBy(desc(__results.ethTransactionId), desc(__results.createdAt)),
    );

    return {
      transactions: results.map((tx) => ({
        id: tx.ethTransactionId,
        transactionHash: tx.transactionHash,
        timestamp: tx.createdAt.getTime(),
        txConfigs: tx.txConfigs ?? [],
        result: {
          status: tx.status,
          successCount: tx.successCount,
        },
      })),
      nextCursor: results.at(-1)?.ethTransactionId,
    };
  });

function getEthTransactions(input: z.infer<typeof inputSchema>) {
  const getFilter = () => {
    const filters = [
      eq(analysisSchema.ethTransaction.deploymentId, input.deploymentId),
      eq(analysisSchema.ethTransaction.functionId, input.functionId.toString()),
      eq(analysisSchema.ethTransaction.chainId, input.chainId),
    ];
    if (input.search) {
      filters.push(
        ilike(
          analysisSchema.ethTransaction.transactionHash,
          `%${input.search}%`,
        ),
      );
    }
    if (input.cursor) {
      filters.push(lt(analysisSchema.ethTransaction.id, input.cursor));
    }
    if (input.batchId) {
      filters.push(eq(analysisSchema.ethTransaction.batchId, input.batchId));
    }
    if (input.txConfigs.length > 0) {
      filters.push(
        arrayContains(analysisSchema.ethTransaction.txConfigs, input.txConfigs),
      );
    }
    return and(...filters);
  };

  return analysisDb
    .select({
      id: analysisSchema.ethTransaction.id,
      transactionHash: analysisSchema.ethTransaction.transactionHash,
      createdAt: analysisSchema.ethTransaction.createdAt,
      functionId: analysisSchema.ethTransaction.functionId,
      deploymentId: analysisSchema.ethTransaction.deploymentId,
      txConfigs: analysisSchema.ethTransaction.txConfigs,
    })
    .from(analysisSchema.ethTransaction)
    .orderBy(desc(analysisSchema.ethTransaction.id))
    .limit(input.limit + 1)
    .where(getFilter())
    .as("ethTransactions");
}

function getProcessedTransactionsWithEthTransactions(
  input: z.infer<typeof inputSchema>,
  ethTransactions: ReturnType<typeof getEthTransactions>,
) {
  const getFilter = () => {
    let baseFilter = and(
      eq(analysisSchema.processedTransaction.deploymentId, input.deploymentId),
      eq(
        analysisSchema.processedTransaction.functionId,
        input.functionId.toString(),
      ),
      eq(analysisSchema.processedTransaction.chainId, input.chainId),
    );

    return baseFilter;
  };

  return analysisDb
    .select({
      ethTransactionId: ethTransactions.id,
      timestamp: analysisSchema.processedTransaction.timestamp,
      processedBatchId: analysisSchema.processedTransaction.processedBatchId,
      transactionHash: ethTransactions.transactionHash,
      status: analysisSchema.processedTransaction.status,
      txConfigs: ethTransactions.txConfigs,
      deploymentId: analysisSchema.processedTransaction.deploymentId,
      functionId: analysisSchema.processedTransaction.functionId,
      chainId: analysisSchema.processedTransaction.chainId,
      createdAt: ethTransactions.createdAt,
    })
    .from(analysisSchema.processedTransaction)
    .where(getFilter())
    .rightJoin(
      ethTransactions,
      and(
        eq(
          analysisSchema.processedTransaction.transactionHash,
          ethTransactions.transactionHash,
        ),
      ),
    )
    .as("processedTransactions");
}

function getProcessedTransactionsWithBatch(
  input: z.infer<typeof inputSchema>,
  processedTransactions: ReturnType<
    typeof getProcessedTransactionsWithEthTransactions
  >,
) {
  const processedBatch = analysisDb
    .select()
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
    .as("processedBatch");

  return analysisDb
    .select({
      ethTransactionId: processedTransactions.ethTransactionId,
      timestamp: processedTransactions.timestamp,
      batchId: processedBatch.batchId,
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
      processedBatch,
      eq(processedBatch.id, processedTransactions.processedBatchId),
    )
    .as("processedTransactionsWithBatch");
}

function getAggregatedStats(
  input: z.infer<typeof inputSchema>,
  processedTransactionsWithBatch: ReturnType<
    typeof getProcessedTransactionsWithBatch
  >,
) {
  const getFilter = () => {
    let baseFilter = and(sql`1 = 1`);

    if (input.status.length > 0) {
      baseFilter = and(
        baseFilter,
        inArray(processedTransactionsWithBatch.status, input.status),
      );
    }

    return baseFilter;
  };

  return analysisDb
    .select({
      ethTransactionId: processedTransactionsWithBatch.ethTransactionId,
      processedBatchId: processedTransactionsWithBatch.processedBatchId,
      timestamp: max(processedTransactionsWithBatch.timestamp).as(
        "txCountsTimestamp",
      ),
      transactionHash: processedTransactionsWithBatch.transactionHash,
      txConfigs: processedTransactionsWithBatch.txConfigs,
      status: sql<
        "SUCCESS" | "FAILED" | "PENDING"
      >`COALESCE(CASE WHEN BOOL_AND(${processedTransactionsWithBatch.status} = 'SUCCESS') THEN 'SUCCESS' ELSE 'FAILED' END, 'PENDING')`.as(
        "status",
      ),
      successCount:
        sql<number>`COALESCE(CAST(SUM(CASE WHEN ${processedTransactionsWithBatch.status} = 'SUCCESS' THEN 1 ELSE 0 END) AS INT), 0)`.as(
          "successCount",
        ),
      createdAt: processedTransactionsWithBatch.createdAt,
    })
    .from(processedTransactionsWithBatch)
    .where(getFilter())
    .groupBy(
      processedTransactionsWithBatch.transactionHash,
      processedTransactionsWithBatch.processedBatchId,
      processedTransactionsWithBatch.ethTransactionId,
      processedTransactionsWithBatch.createdAt,
      processedTransactionsWithBatch.txConfigs,
    )
    .as("aggregatedStats");
}

import { manifestSchema, parseManifest } from "@convect-xyz/lib";
import { analysisSchema } from "@convect-xyz/server";
import { TRPCError } from "@trpc/server";
import { and, count, eq, sql, SQLWrapper } from "drizzle-orm";
import { Redis } from "ioredis";
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

const redisClient = new Redis(
  25061,
  "rediss://default:AVNS_7BaBQxFTF74jG4c8B1T@db-redis-nyc3-60846-do-user-17204040-0.e.db.ondigitalocean.com",
  {
    tls: {
      checkServerIdentity: (servername, cert) => {
        return undefined;
      },
    },
  },
);

export const getOverview = protectedProcedure
  .input(
    z.object({
      functionId: z.number(),
      chainId: z.number(),
      deploymentId: z.string(),
    }),
  )
  .output(
    z.object({
      chain: z.object({
        name: z.string(),
        chainId: z.number(),
      }),
      manifest: manifestSchema,
      chains: z
        .array(
          z.object({
            name: z.string(),
            chainId: z.number(),
          }),
        )
        .nullable(),
      lastFetchedBlock: z.number(),
      transactionCount: z.number(),
      processedTransactionsCount: z.number(),
      avgDuration: z.number(),
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

    const deployment = await ctx.db.query.deployment.findFirst({
      where(fields, { eq, and }) {
        return and(
          eq(fields.functionId, input.functionId),
          eq(fields.status, "SUCCESS"),
        );
      },
      orderBy(fields, { desc }) {
        return desc(fields.createdAt);
      },
    });

    if (!deployment) {
      throw new TRPCError({
        message: "Deployment not found",
        code: "NOT_FOUND",
      });
    }

    await throwIfNotProjectCollaborator({
      projectId: fn.projectId,
      userId: ctx.session.user.id,
    });

    const [fetchState, txCount, avgDuration, successfulTx] = await Promise.all([
      getFetchState(
        input.functionId.toString(),
        input.chainId,
        input.deploymentId,
      ),
      getTxCount(
        input.functionId.toString(),
        input.chainId,
        input.deploymentId,
      ),
      getAvgDuration(
        input.functionId.toString(),
        input.chainId,
        input.deploymentId,
      ),
      getSuccessfulTxCount(
        input.functionId.toString(),
        input.chainId,
        input.deploymentId,
      ),
    ]);

    const producer = await ctx.db.query.producers.findFirst({
      where(fields, { eq }) {
        return eq(fields.chainId, input.chainId);
      },
    });

    if (!producer) {
      throw new TRPCError({
        message: "Producer not found",
        code: "NOT_FOUND",
      });
    }

    const manifest = parseManifest(deployment.manifest);
    const chains =
      manifest?.chains.map((c: any) => ({
        name: c.name,
        chainId: c.chainId,
      })) ?? null;

    return {
      chain: {
        name: producer.name,
        chainId: producer.chainId,
      },
      transactionCount: txCount ?? 0,
      processedTransactionsCount: successfulTx,
      lastFetchedBlock: fetchState?.lastBlock ?? 0,
      avgDuration: avgDuration,
      manifest,
      chains,
    };
  });

const getAvgDuration = async (
  internalId: string,
  version: number,
  deploymentId: string,
) => {
  return analysisDb
    .execute(
      sql`SELECT AVG(duration_ms) FROM reported_metrics WHERE handler_id = ${internalId} AND handler_version = ${version} AND deployment_id = ${deploymentId}`,
    )
    .then((r) => Number(r.rows.at(0)!.avg));
};

const getSuccessfulTxCount = async (
  functionId: string,
  chainId: number,
  deploymentId: string,
) => {
  const processedTransactions = analysisDb
    .select({
      transactionHash: analysisSchema.processedTransaction.transactionHash,
      functionId: analysisSchema.processedTransaction.functionId,
      chainId: analysisSchema.processedTransaction.chainId,
      deploymentId: analysisSchema.processedTransaction.deploymentId,
    })
    .from(analysisSchema.processedTransaction)
    .where(eq(analysisSchema.processedTransaction.status, "SUCCESS"))
    .groupBy(
      analysisSchema.processedTransaction.transactionHash,
      analysisSchema.processedTransaction.deploymentId,
      analysisSchema.processedTransaction.functionId,
      analysisSchema.processedTransaction.chainId,
    )
    .as("processedTransactions");

  return analysisDb
    .select({
      successIsUniqueCount: count(processedTransactions.transactionHash),
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
    .where(
      and(
        eq(analysisSchema.ethTransaction.functionId, functionId),
        eq(analysisSchema.ethTransaction.deploymentId, deploymentId),
        eq(analysisSchema.ethTransaction.chainId, chainId),
      ),
    )
    .then((r) => Number(r.at(0)!.successIsUniqueCount));
};

const getTxCount = async (
  functionId: string,
  chainId: number,
  deploymentId: string,
) => {
  const result = await explainAnalyze(
    analysisDb,
    analysisDb
      .select({
        numTransactions: count(analysisSchema.ethTransaction.deploymentId),
      })
      .from(analysisSchema.ethTransaction)
      .where(
        and(
          eq(analysisSchema.ethTransaction.functionId, functionId),
          eq(analysisSchema.ethTransaction.deploymentId, deploymentId),
          eq(analysisSchema.ethTransaction.chainId, chainId),
        ),
      ),
  );

  return result.length > 0 ? result[0]?.numTransactions : null;
};

const getFetchState = async (
  functionId: string,
  version: number,
  deploymentId: string,
) => {
  const [lastBlock, state] = await redisClient.mget(
    `${functionId}-${version}-${deploymentId}-last-block`,
    `${functionId}-${version}-${deploymentId}-state`,
  );

  return {
    lastBlock: lastBlock ? Number(lastBlock) : null,
    state: state ? state : null,
  };
};

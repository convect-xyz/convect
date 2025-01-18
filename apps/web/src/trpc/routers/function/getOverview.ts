import { manifestSchema, parseManifest } from "@convect-xyz/lib";
import { analysisSchema } from "@convect-xyz/server";
import { TRPCError } from "@trpc/server";
import { and, count, eq, sql } from "drizzle-orm";
import { Redis } from "ioredis";
import { z } from "zod";
import { analysisDb } from "~/server/db/analysis";
import { protectedProcedure } from "~/trpc/trpc";
import { throwIfNotProjectCollaborator } from "../permissions";

const redisClient = new Redis(
  25061,
  "rediss://default:REDACTED@db-redis-nyc3-60846-do-user-17204040-0.e.db.ondigitalocean.com",
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
  return analysisDb
    .select({
      count: count(analysisSchema.ethProcessedResult.id),
    })
    .from(analysisSchema.ethProcessedResult)
    .where(
      and(
        eq(analysisSchema.ethProcessedResult.functionId, functionId),
        eq(analysisSchema.ethProcessedResult.deploymentId, deploymentId),
        eq(analysisSchema.ethProcessedResult.chainId, chainId),
      ),
    )
    .then((r) => Number(r.at(0)!.count));
};

const getTxCount = async (
  functionId: string,
  chainId: number,
  deploymentId: string,
) => {
  const result = await analysisDb
    .select({
      numTransactions: count(analysisSchema.ethTransactions.id),
    })
    .from(analysisSchema.ethTransactions)
    .where(
      and(
        eq(analysisSchema.ethTransactions.functionId, functionId),
        eq(analysisSchema.ethTransactions.deploymentId, deploymentId),
        eq(analysisSchema.ethTransactions.chainId, chainId),
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

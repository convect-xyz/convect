import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { Redis } from "ioredis";
import { z } from "zod";
import { analysisDb } from "~/server/db/analysis";
import { protectedProcedure } from "~/trpc/trpc";
import { throwIfNotProjectCollaborator } from "../permissions";

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
    }),
  )
  .output(
    z.object({
      status: z.enum(["failed", "processing", "provisioning"]),
      chain: z.object({
        name: z.string(),
        chainId: z.number(),
      }),
      lastFetchedBlock: z.number(),
      transactionCount: z.number(),
      processedTransactionsCount: z.number(),
      avgDuration: z.number(),
      version: z.number(),
      internalId: z.string(),
    }),
  )
  .query(async (opts) => {
    const { input, ctx } = opts;

    const currentDeployment = await ctx.db.query.deployment.findFirst({
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
    if (!currentDeployment) {
      throw new TRPCError({
        message: "Deployment not found",
        code: "NOT_FOUND",
      });
    }

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
    const [fetchState, txCount, avgDuration, successfulTx] = await Promise.all([
      getFetchState(
        input.functionId.toString(),
        input.chainId,
        currentDeployment.id,
      ),
      getTxCount(
        input.functionId.toString(),
        input.chainId,
        currentDeployment.id,
      ),
      getAvgDuration(
        input.functionId.toString(),
        input.chainId,
        currentDeployment.id,
      ),
      getSuccessfulTxCount(
        input.functionId.toString(),
        input.chainId,
        currentDeployment.id,
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

    return {
      status: fetchState.state ? "processing" : "provisioning",
      chain: {
        name: producer.name,
        chainId: producer.chainId,
      },
      transactionCount: txCount ?? 0,
      processedTransactionsCount: successfulTx,
      lastFetchedBlock: fetchState?.lastBlock ?? 0,
      avgDuration: avgDuration,
      version: 0,
      internalId: "handler.internalId",
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
  internalId: string,
  version: number,
  deploymentId: string,
) => {
  return analysisDb
    .execute(
      sql`SELECT COUNT(*) FROM
        (SELECT DISTINCT transaction_hash FROM processed_transactions WHERE handler_id = ${internalId} 
          AND handler_version = ${version}
          AND status = 'SUCCESS'
          AND deployment_id = ${deploymentId})
      `,
    )
    .then((r) => Number(r.rows.at(0)!.count));
};

const getTxCount = async (
  functionId: string,
  chainId: number,
  deploymentId: string,
) => {
  const txCount = await redisClient.get(
    `${functionId}-${chainId}-${deploymentId}-tx-count`,
  );
  return txCount ? Number(txCount) : null;
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

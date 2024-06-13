import { TRPCError } from "@trpc/server";
import axios from "axios";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { Redis } from "ioredis";
import { Pool } from "pg";
import { z } from "zod";
import { env } from "~/env";
import { protectedProcedure } from "~/server/api/trpc";

const conn = new Pool({
  connectionString: env.REPORTING_DATABASE_URL,
  ssl: {
    checkServerIdentity: (servername, cert) => {
      return undefined;
    },
    rejectUnauthorized: false,
  },
});

const redisClient = new Redis(
  6379,
  "rediss://default:REDACTED@stirred-jawfish-46999.upstash.io",
  {
    tls: {
      checkServerIdentity: (servername, cert) => {
        return undefined;
      },
    },
  },
);

export const processedTransactions = pgTable("processed_transactions", {
  id: serial("id").primaryKey(),
  transactionHash: varchar("transaction_hash").notNull(),
  status: varchar("status", { length: 256 }).notNull(),
  timestamp: timestamp("timestamp").notNull(),
});

const db = drizzle(conn, { schema: { processedTransactions } });

export const getOverview = protectedProcedure
  .input(
    z.object({
      handlerId: z.number(),
    }),
  )
  .output(
    z.object({
      status: z.enum(["failed", "processing", "provisioning"]),
      chain: z.object({
        name: z.string(),
      }),
      lastFetchedBlock: z.number(),
      transactionCount: z.number(),
      processedTransactionsCount: z.number(),
      avgDuration: z.number(),
      version: z.number(),
    }),
  )
  .query(async (opts) => {
    const { input, ctx } = opts;

    const handler = await ctx.db.query.handler.findFirst({
      where(fields, { eq }) {
        return eq(fields.id, input.handlerId);
      },
      with: {
        producer: true,
      },
    });

    if (!handler) {
      throw new TRPCError({ message: "Handler not found", code: "NOT_FOUND" });
    }

    const [fetchState, txCount, avgDuration, successfulTx] = await Promise.all([
      getFetchState(handler.internalId, handler.version),
      getTxCount(handler.internalId, handler.version),
      getAvgDuration(handler.internalId, handler.version),
      getSuccessfulTxCount(handler.internalId, handler.version),
    ]);

    return {
      status: fetchState ? "processing" : "provisioning",
      chain: {
        name: handler.producer.name,
      },
      transactionCount: txCount ?? 0,
      processedTransactionsCount: successfulTx,
      lastFetchedBlock: fetchState?.lastBlock ?? 0,
      avgDuration: avgDuration,
      version: handler.version,
    };
  });

const getAvgDuration = async (internalId: string, version: number) => {
  return axios
    .post(
      "https://api.eu-central-1.aws.tinybird.co/v0/sql",
      {
        q: `%
    SELECT AVG(duration_ms) FROM ingest_metrics WHERE handler_id = {{String(handler_id)}} AND handler_version = {{String(handler_version)}}`,
        handler_id: internalId,
        handler_version: version.toString(),
      },
      {
        headers: {
          Authorization:
            "Bearer REDACTED",
        },
      },
    )
    .then((r) => Number(r.data))
    .then((v) => (Number.isNaN(v) ? 0 : v));
};

const getSuccessfulTxCount = async (internalId: string, version: number) => {
  return db
    .execute(
      sql`SELECT COUNT(*) FROM
        (SELECT DISTINCT transaction_hash FROM processed_transactions) WHERE handler_id = ${internalId} 
          AND handler_version = ${version}
          AND status = 'SUCCESS') as processed_txs
      `,
    )
    .then((r) => Number(r.rows.at(0)!.count));
};

const getTxCount = async (internalId: string, version: number) => {
  const txCount = await redisClient.get(`tx-count-${internalId}-${version}`);
  return txCount ? Number(txCount) : null;
};

const getFetchState = async (internalId: string, version: number) => {
  const response = await redisClient
    .call(`JSON.GET`, `${internalId}-${version}`)
    .then((v) => JSON.parse(v as string));

  return response
    ? {
        lastBlock: Number(response.LastBlock_),
      }
    : null;
};

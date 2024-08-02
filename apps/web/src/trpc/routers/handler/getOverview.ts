import { TRPCError } from "@trpc/server";
import axios from "axios";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { Redis } from "ioredis";
import { Pool } from "pg";
import { z } from "zod";
import { env } from "~/env";
import { protectedProcedure } from "~/trpc/trpc";

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

export const processedTransactions = pgTable("processed_transactions_temp", {
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
      status: fetchState.state ? "processing" : "provisioning",
      chain: {
        name: handler.producer.name,
        chainId: handler.producer.chainId,
      },
      transactionCount: txCount ?? 0,
      processedTransactionsCount: successfulTx,
      lastFetchedBlock: fetchState?.lastBlock ?? 0,
      avgDuration: avgDuration,
      version: handler.version,
      internalId: handler.internalId,
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
            "Bearer p.eyJ1IjogIjJlYjlhNzU2LWFjMDMtNDJmOC1iNGY2LWI2M2RhN2JiMjkyNiIsICJpZCI6ICJjZTE2YmI1Yi04NDBiLTQwNGMtYjk4Yi0zMjJiNDc4ZDMyYWEiLCAiaG9zdCI6ICJhd3MtZXUtY2VudHJhbC0xIn0.1Bvj9OA-NZQ0cU62T1sweLScNLMPsv8FIGaP8nkHoRw",
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
        (SELECT DISTINCT transaction_hash FROM processed_transactions_temp WHERE handler_id = ${internalId} 
          AND handler_version = ${version}
          AND status = 'SUCCESS')
      `,
    )
    .then((r) => Number(r.rows.at(0)!.count));
};

const getTxCount = async (internalId: string, version: number) => {
  const txCount = await redisClient.get(`tx-count-${internalId}-${version}`);
  return txCount ? Number(txCount) : null;
};

const getFetchState = async (internalId: string, version: number) => {
  const [lastBlock, state] = await redisClient.mget(
    `${internalId}-${version}-last-block`,
    `${internalId}-${version}-state`,
  );

  return {
    lastBlock: lastBlock ? Number(lastBlock) : null,
    state: state ? state : null,
  };
};

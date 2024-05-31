import { TRPCError } from "@trpc/server";
import axios from "axios";
import { sql } from "drizzle-orm";
import { pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/postgres-js";
import { Redis } from "ioredis";
import postgres from "postgres";
import { z } from "zod";
import { protectedProcedure } from "~/server/api/trpc";
const conn = postgres(
  "postgresql://postgres:REDACTED@example.cxy2caa825w6.eu-west-1.rds.amazonaws.com:5432/postgres?sslmode=require",
);

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
      lastFetchedBlock: z.number(),
      transactionCount: z.number(),
      processedTransactionsCount: z.number(),
      avgDuration: z.number(),
    }),
  )
  .query(async (opts) => {
    const { input, ctx } = opts;

    const handler = await ctx.db.query.handler.findFirst({
      where(fields, { eq }) {
        return eq(fields.id, input.handlerId);
      },
    });

    if (!handler) {
      throw new TRPCError({ message: "Handler not found", code: "NOT_FOUND" });
    }

    const [fetchState, txCount, avgDuration, successfulTx] = await Promise.all([
      getFetchState(handler.internalId),
      getTxCount(handler.internalId),
      getAvgDuration(handler.internalId),
      getSuccessfulTxCount(handler.internalId),
    ]);

    return {
      transactionCount: txCount,
      processedTransactionsCount: successfulTx,
      lastFetchedBlock: fetchState.lastBlock,
      avgDuration: avgDuration,
    };
  });

const getAvgDuration = async (internalId: string) => {
  return axios
    .post(
      "https://api.eu-central-1.aws.tinybird.co/v0/sql",
      {
        q: `%
    SELECT AVG(duration_ms) FROM ingest_metrics WHERE handler_id = {{String(handler_id)}}`,
        handler_id: internalId,
      },
      {
        headers: {
          Authorization:
            "Bearer REDACTED",
        },
      },
    )
    .then((r) => r.data)
    .then(Number);
};

const getSuccessfulTxCount = async (internalId: string) => {
  return db
    .execute(
      sql`SELECT COUNT(DISTINCT(transaction_hash)) FROM processed_transactions WHERE handler_id = ${internalId} AND status = 'SUCCESS'`,
    )
    .then((r) => Number(r.at(0)!.count));
};

const getTxCount = async (internalId: string) => {
  const [txCount] = await redisClient.mget(`tx-count-${internalId}`);
  return txCount ? Number(txCount) : 0;
};

const getFetchState = async (internalId: string) => {
  const response = await redisClient
    .call(`JSON.GET`, internalId)
    .then((v) => JSON.parse(v as string));

  return response
    ? {
        lastBlock: Number(response.LastBlock_),
      }
    : {
        lastBlock: 0,
      };
};

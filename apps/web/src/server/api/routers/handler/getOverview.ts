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
  "postgresql://postgres:postgres@example.cxy2caa825w6.eu-west-1.rds.amazonaws.com:5432/postgres?sslmode=require",
);

const redisClient = new Redis(
  6379,
  "rediss://default:AbeXAAIncDFjNTRiNjgyMmZjNzM0ZGQzOTZmYTQzZTA5ODQ4YjVkM3AxNDY5OTk@stirred-jawfish-46999.upstash.io",
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

    try {
      const response = await redisClient
        .call(`JSON.GET`, handler.internalId)
        .then((v) => JSON.parse(v as string));
      const [txCount] = await redisClient.mget(
        `tx-count-${handler.internalId}`,
      );

      const avgDuration = await axios
        .post(
          "https://api.eu-central-1.aws.tinybird.co/v0/sql",
          {
            q: `%
        SELECT AVG(duration_ms) FROM ingest_metrics WHERE handler_id = {{String(handler_id)}}`,
            handler_id: handler.internalId,
          },
          {
            headers: {
              Authorization:
                "Bearer p.eyJ1IjogIjJlYjlhNzU2LWFjMDMtNDJmOC1iNGY2LWI2M2RhN2JiMjkyNiIsICJpZCI6ICJjZTE2YmI1Yi04NDBiLTQwNGMtYjk4Yi0zMjJiNDc4ZDMyYWEiLCAiaG9zdCI6ICJhd3MtZXUtY2VudHJhbC0xIn0.1Bvj9OA-NZQ0cU62T1sweLScNLMPsv8FIGaP8nkHoRw",
            },
          },
        )
        .then((r) => r.data)
        .catch((e) => {
          console.log(e);
          throw e;
        });

      const successfulTx = await db
        .execute(
          sql`SELECT COUNT(DISTINCT(transaction_hash)) FROM processed_transactions WHERE handler_id = ${handler.internalId} AND status = 'SUCCESS'`,
        )
        .then((r) => Number(r.at(0)!.count));

      const recentTransactions = await db.execute<{
        transaction_hash: string;
        status: string;
        timestamp: Date;
      }>(sql`SELECT *
          FROM (SELECT DISTINCT ON (${processedTransactions.transactionHash}) ${processedTransactions.transactionHash}, ${processedTransactions.status}, ${processedTransactions.timestamp} 
                FROM ${processedTransactions}
                WHERE handler_id = ${handler.internalId}) as transactions
          ORDER BY transactions.timestamp DESC
          LIMIT 25`);

      return {
        transactionCount: Number(txCount),
        processedTransactionsCount: successfulTx,
        lastFetchedBlock: Number(response.LastBlock_),
        avgDuration: Number(avgDuration),
      };
    } catch (e) {
      console.log(e);
    }
    return {} as any;
  });

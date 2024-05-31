import { TRPCError } from "@trpc/server";
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
  handlerId: varchar("handler_id").notNull(),
  transactionHash: varchar("transaction_hash").notNull(),
  status: varchar("status", { length: 256 }).notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
});

const db = drizzle(conn, { schema: { processedTransactions } });

export const getTransactions = protectedProcedure
  .input(
    z.object({
      limit: z.number().min(1).max(25).default(25),
      cursor: z.number().nullish(),
      search: z.string().nullish(),
      status: z.enum(["FAILED", "SUCCESS"]).nullish(),
      handlerId: z.number(),
    }),
  )
  .output(
    z.object({
      transactions: z.array(
        z.object({
          id: z.number(),
          transactionHash: z.string(),
          status: z.enum(["SUCCESS", "FAILED"]),
          timestamp: z.number(),
        }),
      ),
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

    const recentTransactions = await db.query.processedTransactions.findMany({
      where(fields, { eq, and, ilike }) {
        let baseFilter = eq(fields.handlerId, handler.internalId);
        if (input.search) {
          baseFilter = and(
            baseFilter,
            ilike(fields.transactionHash, `%${input.search}%`),
          )!;
        }
        if (input.status) {
          baseFilter = and(baseFilter, eq(fields.status, input.status))!;
        }
        return baseFilter;
      },
      orderBy(fields, { desc }) {
        return desc(fields.timestamp);
      },
      limit: 25,
    });

    return {
      transactions: recentTransactions.map((tx) => ({
        id: tx.id,
        transactionHash: tx.transactionHash,
        status: tx.status as "SUCCESS" | "FAILED",
        timestamp: tx.timestamp.getTime(),
      })),
    };
  });

import { TRPCError } from "@trpc/server";
import { and, desc, eq, ilike, max } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";
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

export const processedTransactions = pgTable("processed_transactions", {
  id: serial("id").primaryKey(),
  handlerId: varchar("handler_id").notNull(),
  handlerVersion: varchar("handler_version").notNull(),
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

    const getFilter = () => {
      let baseFilter = and(
        eq(processedTransactions.handlerId, handler.internalId),
        eq(processedTransactions.handlerVersion, handler.version.toString()),
      );
      if (input.search) {
        baseFilter = and(
          baseFilter,
          ilike(processedTransactions.transactionHash, `%${input.search}%`),
        )!;
      }
      if (input.status) {
        baseFilter = and(
          baseFilter,
          eq(processedTransactions.status, input.status),
        )!;
      }
      return baseFilter;
    };

    const maxTimestamp = max(processedTransactions.timestamp).as(
      "max_timestamp",
    );
    const distinctTransactions = db
      .select({
        transactionHash: processedTransactions.transactionHash,
        maxTimestamp,
      })
      .from(processedTransactions)
      .where(getFilter())
      .groupBy(processedTransactions.transactionHash)
      .orderBy(desc(maxTimestamp))
      .limit(input.limit)
      .as("distinct_transactions");

    const recentTransactions = await db
      .select()
      .from(processedTransactions)
      .innerJoin(
        distinctTransactions,
        and(
          eq(
            processedTransactions.transactionHash,
            distinctTransactions.transactionHash,
          ),
          eq(
            processedTransactions.timestamp,
            distinctTransactions.maxTimestamp,
          ),
        ),
      )
      .orderBy(desc(processedTransactions.timestamp))
      .limit(input.limit);

    return {
      transactions: recentTransactions
        .flatMap((v) => v.processed_transactions)
        .map((tx) => ({
          id: tx.id,
          transactionHash: tx.transactionHash,
          status: tx.status as "SUCCESS" | "FAILED",
          timestamp: tx.timestamp.getTime(),
        })),
    };
  });

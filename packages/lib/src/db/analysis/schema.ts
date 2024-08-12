import { pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

export const processedTransactions = pgTable("processed_transactions", {
  id: serial("id").primaryKey(),
  handlerId: varchar("handler_id").notNull(),
  handlerVersion: varchar("handler_version").notNull(),
  transactionHash: varchar("transaction_hash").notNull(),
  deploymentId: varchar("deployment_id").notNull(),
  status: varchar("status", { length: 256 }).notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
});

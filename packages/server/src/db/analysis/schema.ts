import {
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const processedTransactions = pgTable("processed_transactions", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id"),
  handlerId: varchar("handler_id").notNull(),
  handlerVersion: varchar("handler_version").notNull(),
  transactionHash: varchar("transaction_hash").notNull(),
  deploymentId: varchar("deployment_id").notNull(),
  status: varchar("status", { length: 256 }).notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
});

export const invocation = pgTable("invocation", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id"),
  invocationId: varchar("invocation_id").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
  numProcessed: integer("num_processed").notNull(),
  deploymentId: varchar("deployment_id").notNull(),
});

export const reportedMetrics = pgTable("reported_metrics", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id"),
  handlerId: varchar("handler_id").notNull(),
  handlerVersion: varchar("handler_version").notNull(),
  durationMs: integer("duration_ms").notNull(),
  billedDurationMs: integer("billed_duration_ms").notNull(),
  memorySizeMb: integer("memory_size_mb").notNull(),
  maxMemoryUsedMb: integer("max_memory_used_mb").notNull(),
  initDurationMs: integer("init_duration_ms"),
  restoreDurationMs: integer("restore_duration_ms"),
  deploymentId: varchar("deployment_id").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
});

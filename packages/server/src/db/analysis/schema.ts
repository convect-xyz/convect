import {
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const ethTransaction = pgTable("eth_transaction", {
  id: serial("id").primaryKey(),
  batchId: varchar("batch_id", { length: 256 }).notNull(),
  deploymentId: varchar("deployment_id").notNull(),
  functionId: varchar("function_id").notNull(),
  projectId: integer("project_id").notNull(),
  chainId: integer("chain_id").notNull(),
  transactionHash: varchar("transaction_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  txConfigs: integer("tx_configs").array(),
});

export const processedBatch = pgTable("processed_batch", {
  id: serial("id").primaryKey(),
  functionId: varchar("function_id").notNull(),
  batchId: varchar("batch_id").notNull(),
  chainId: integer("chain_id").notNull(),
  deploymentId: varchar("deployment_id").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
  status: varchar("status", { length: 256 }).notNull(),
});

export const processedTransaction = pgTable("processed_transaction", {
  id: serial("id").primaryKey(),
  processedBatchId: varchar("processed_batch_id", { length: 256 }).notNull(),
  deploymentId: varchar("deployment_id").notNull(),
  functionId: varchar("function_id").notNull(),
  chainId: integer("chain_id").notNull(),
  transactionHash: varchar("transaction_hash").notNull(),
  processedLogIndices: integer("processed_log_indices").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
  handler: varchar("handler").notNull(),
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

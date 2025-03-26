import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  json,
  pgEnum,
  pgTableCreator,
  primaryKey,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";
import { type AdapterAccount } from "next-auth/adapters";

export const createTable = pgTableCreator((name) => `web_${name}`);

export const planEnum = pgEnum("plan_type", ["HOBBY", "PRO", "ENTERPRISE"]);

export type PlanType = (typeof planEnum.enumValues)[number];

export const users = createTable("user", {
  id: varchar("id").notNull().primaryKey(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).notNull(),
  emailVerified: timestamp("emailVerified", {
    mode: "date",
  }).default(sql`CURRENT_TIMESTAMP`),
  image: varchar("image", { length: 255 }),
});

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  apiKeys: many(apiKey),
}));

export const accounts = createTable(
  "account",
  {
    userId: varchar("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 255 })
      .$type<AdapterAccount["type"]>()
      .notNull(),
    provider: varchar("provider", { length: 255 }).notNull(),
    providerAccountId: varchar("providerAccountId", { length: 255 }).notNull(),
    refresh_token: text("refresh_token"),
    refresh_token_expires_in: integer("refresh_token_expires_in"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: varchar("token_type", { length: 255 }),
    scope: varchar("scope", { length: 255 }),
    id_token: text("id_token"),
    session_state: varchar("session_state", { length: 255 }),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
    userIdIdx: index("account_userId_idx").on(account.userId),
  })
);

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
  pendingInvites: many(pendingInvites),
}));

export const apiKey = createTable(
  "api_key",
  {
    id: serial("id").notNull().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    userId: varchar("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: varchar("token", { length: 255 }).notNull().unique(),
  },
  (apiKey) => ({
    name_user_unique: unique().on(apiKey.name, apiKey.userId),
    userIdIdx: index("apiKey_userId_idx").on(apiKey.userId),
  })
);

export const apiKeyRelations = relations(apiKey, ({ one }) => ({
  user: one(users, { fields: [apiKey.userId], references: [users.id] }),
}));

export const sessions = createTable(
  "session",
  {
    sessionToken: varchar("sessionToken", { length: 255 })
      .notNull()
      .primaryKey(),
    userId: varchar("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (session) => ({
    userIdIdx: index("session_userId_idx").on(session.userId),
  })
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const verificationTokens = createTable(
  "verificationToken",
  {
    identifier: varchar("identifier", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);

export const projects = createTable(
  "project",
  {
    id: serial("id").notNull().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    userId: varchar("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    stripeCustomerId: varchar("stripe_customer_id", { length: 255 }).unique(),
    stripeSubscriptionId: varchar("stripe_subscription_id", {
      length: 255,
    }).unique(),
    planType: planEnum("plan_type").default("HOBBY").notNull(),
    planUrl: varchar("plan_url", { length: 255 }),
  },
  (projects) => ({
    userIdIdx: index("project_userId_idx").on(projects.userId),
    projectNameUserId: unique().on(projects.name, projects.userId),
  })
);

export const projectRelations = relations(projects, ({ one, many }) => ({
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  collaborators: many(projectCollaborators),
}));

export const projectCollaborators = createTable(
  "project_collaborator",
  {
    projectId: integer("projectId")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: varchar("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (projectCollaborators) => ({
    projectIdIdx: index("project_collaborator_projectId_idx").on(
      projectCollaborators.projectId
    ),
    userIdIdx: index("project_collaborator_userId_idx").on(
      projectCollaborators.userId
    ),
    uniqueProjectUserIdx: unique().on(
      projectCollaborators.projectId,
      projectCollaborators.userId
    ),
  })
);

export const projectCollaboratorsRelations = relations(
  projectCollaborators,
  ({ one }) => ({
    user: one(users, {
      fields: [projectCollaborators.userId],
      references: [users.id],
    }),
    project: one(projects, {
      fields: [projectCollaborators.projectId],
      references: [projects.id],
    }),
  })
);

export const pendingInvites = createTable(
  "pending_invite",
  {
    id: serial("id").notNull().primaryKey(),
    projectId: integer("projectId")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: varchar("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (pendingInvites) => ({
    projectIdIdx: index("pending_invite_projectId_idx").on(
      pendingInvites.projectId
    ),
    userIdIdx: index("pending_invite_userId_idx").on(pendingInvites.userId),
    uniqueProjectUserIdx: unique().on(
      pendingInvites.projectId,
      pendingInvites.userId
    ),
  })
);

export const pendingInvitesRelations = relations(pendingInvites, ({ one }) => ({
  user: one(users, { fields: [pendingInvites.userId], references: [users.id] }),
  project: one(projects, {
    fields: [pendingInvites.projectId],
    references: [projects.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  collaborators: many(projectCollaborators),
}));

export const convectFunctions = createTable(
  "convectFunction",
  {
    id: serial("id").notNull().primaryKey(),
    projectId: integer("projectId")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    globalId: varchar("globalId")
      .notNull()
      .default(sql`gen_random_uuid()`),
    name: varchar("name").notNull(),
    description: varchar("description").notNull().default(""),
    infraVersion: varchar("infra_version"),
  },
  (handler) => ({
    projectIdName: unique().on(handler.name, handler.projectId),
  })
);

export const convectFunctionsRelations = relations(
  convectFunctions,
  ({ one, many }) => ({
    project: one(projects, {
      fields: [convectFunctions.projectId],
      references: [projects.id],
    }),
    envs: many(functionEnv),
  })
);

export const functionEnv = createTable(
  "function_env",
  {
    id: serial("id").notNull().primaryKey(),
    functionId: integer("function_id")
      .notNull()
      .references(() => convectFunctions.id, { onDelete: "cascade" }),
    key: varchar("key").notNull(),
    value: varchar("value").notNull(),
    iv: varchar("iv").notNull(),
    lastUpdatedAt: timestamp("last_updated_at").defaultNow().notNull(),
  },
  (functionEnv) => ({
    functionIdName: unique().on(functionEnv.functionId, functionEnv.key),
  })
);

export const handlerEnvRelations = relations(functionEnv, ({ one }) => ({
  fn: one(convectFunctions, {
    fields: [functionEnv.functionId],
    references: [convectFunctions.id],
  }),
}));

export const deploymentStatus = pgEnum("deployment_status", [
  "PENDING",
  "RUNNING",
  "SUCCESS",
  "FAILED",
]);

export type DeploymentStatus = (typeof deploymentStatus.enumValues)[number];

export const deploymentMode = pgEnum("deployment_mode", [
  "init",
  "update",
  "destroy",
]);

export const deployment = createTable(
  "deployment",
  {
    id: varchar("id").notNull().primaryKey(),
    functionId: integer("functionId")
      .notNull()
      .references(() => convectFunctions.id, { onDelete: "cascade" }),
    status: deploymentStatus("status").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    runningAt: timestamp("runningAt"),
    finishedAt: timestamp("finishedAt"),
    ecsTaskId: varchar("ecsTaskId", { length: 255 }).notNull(),
    manifest: json("manifest").notNull(),
    manifestBucket: varchar("manifestBucket", { length: 255 }).notNull(),
    manifestKey: varchar("manifestKey", { length: 255 }).notNull(),
    sourceBucket: varchar("sourceBucket", { length: 255 }).notNull(),
    sourceKey: varchar("sourceKey", { length: 255 }).notNull(),
    version: varchar("version", { length: 255 }).notNull(),
    mode: deploymentMode("mode").notNull(),
    approvedAt: timestamp("approvedAt"),
  },
  (deployment) => ({
    functionIdIdx: index("deployment_functionId_idx").on(deployment.functionId),
  })
);

export const deploymentsRelations = relations(deployment, ({ one }) => ({
  function: one(convectFunctions, {
    fields: [deployment.functionId],
    references: [convectFunctions.id],
  }),
}));

export const producers = createTable(
  "producer",
  {
    id: serial("id").notNull().primaryKey(),
    chainId: integer("chain_id").notNull().unique(),
    pollingUrls: varchar("pollingUrls", { length: 255 })
      .array()
      .default(sql`ARRAY[]::varchar[]`),
    wsUrl: varchar("wsUrl", { length: 255 }).notNull(),
    userId: varchar("userId").references(() => users.id),
    serviceArn: varchar("serviceArn", { length: 255 }),
    topicArn: varchar("topicArn", { length: 255 }),
    name: varchar("name").notNull(),
    etherscanApiKey: varchar("etherscanApiKey", { length: 255 })
      .notNull()
      .default(""),
    etherscanLike: varchar("etherscanLike", { length: 255 })
      .notNull()
      .default(""),
  },
  (producers) => ({
    uniqueName: unique().on(producers.userId, producers.name),
    userIdIdx: index("producers_userId_idx").on(producers.userId),
  })
);

export const producersRelations = relations(producers, ({ one, many }) => ({
  user: one(users, { fields: [producers.userId], references: [users.id] }),
}));

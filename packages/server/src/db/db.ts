import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

export const getConnection = (connectionUrl: string) => postgres(connectionUrl);
export const getDb = (opts: { dbUrl: string | ReturnType<typeof postgres> }) =>
  drizzle(
    typeof opts.dbUrl === "string" ? getConnection(opts.dbUrl) : opts.dbUrl,
    { schema }
  );

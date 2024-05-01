import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

export const getDb = (opts: { dbUrl: string }) =>
  drizzle(postgres(opts.dbUrl), { schema });

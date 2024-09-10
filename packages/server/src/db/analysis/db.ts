import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export const getAnalysisDb = ({ dbUrl }: { dbUrl: string }) => {
  const conn = new Pool({
    connectionString: dbUrl,
    ssl: {
      checkServerIdentity: (servername, cert) => {
        return undefined;
      },
      rejectUnauthorized: false,
    },
  });

  const db = drizzle(conn, { schema });

  return db;
};

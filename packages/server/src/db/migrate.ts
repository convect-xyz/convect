import "dotenv/config";

import { migrate } from "drizzle-orm/postgres-js/migrator";
import { getConnection, getDb } from "./db";

(async function () {
  const connection = getConnection(process.env.DATABASE_URL!);
  const db = getDb({
    dbUrl: connection,
  });
  // This will run migrations on the database, skipping the ones already applied
  await migrate(db, { migrationsFolder: "./drizzle" });
  // Don't forget to close the connection, otherwise the script will hang
  await connection.end();
})();

import "dotenv/config";
import { eq } from "drizzle-orm";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { getConnection, getDb } from "../db/db";
import { producers } from "../db/schema";

// @ts-ignore
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const connection = getConnection(process.env.DATABASE_URL!);
  const db = getDb({
    dbUrl: connection,
  });

  const chains = JSON.parse(
    fs
      .readFileSync(path.join(__dirname, "../../../../config/chains.json"))
      .toString()
  );

  await db
    .insert(producers)
    .values(
      chains.map((c: any) => ({
        id: c.id,
        pollingUrl: c.polling_url,
        wsUrl: c.ws_url,
        topicArn: c.sns_topic,
        name: c.name,
      }))
    )
    .onConflictDoNothing()
    .returning();

  const promises: Promise<any>[] = [];
  for (const p of chains) {
    promises.push(
      db
        .update(producers)
        .set({
          id: p.id,
          pollingUrl: p.polling_url,
          wsUrl: p.ws_url,
          topicArn: p.sns_topic,
          name: p.name,
        })
        .where(eq(producers.id, p.id))
        .returning()
    );
  }
  await Promise.all(promises);

  process.exit(0);
}

main();

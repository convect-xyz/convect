import { chains } from "@infra/config/chains";
import "dotenv/config";
import { eq } from "drizzle-orm";
import { dirname } from "path";
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

  await db
    .insert(producers)
    .values(
      chains.map((c: any) => ({
        chainId: Number(c.id),
        pollingUrl: c.polling_url,
        wsUrl: c.ws_url,
        topicArn: c.sns_topic,
        name: c.name,
        etherscanLike: c.etherscan_like,
        etherscanApiKey: c.etherscan_api_key,
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
          pollingUrls: p.polling_urls,
          wsUrl: p.ws_url,
          topicArn: p.sns_topic,
          name: p.name,
          etherscanLike: p.etherscan_like,
          etherscanApiKey: p.etherscan_api_key,
        })
        .where(eq(producers.chainId, p.id))
        .returning()
    );
  }
  await Promise.all(promises);

  process.exit(0);
}

main();

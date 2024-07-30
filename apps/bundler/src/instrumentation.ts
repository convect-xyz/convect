import { getDb, schema } from "@convect-xyz/lib";
import { init } from "@sentry/node";
import { eq } from "drizzle-orm";

init({
  dsn: "https://c749dc7d2929977538ed3abbd4fbdb4a@o4507692210454528.ingest.de.sentry.io/4507692217729104",
  integrations: [],
  // Performance Monitoring
  tracesSampleRate: 1.0,

  // Set sampling rate for profiling - this is relative to tracesSampleRate
  profilesSampleRate: 1.0,

  // Set initial scope
  initialScope: (scope) => {
    scope.setUser({
      id: process.env.USER_ID,
    });

    scope.setContext("infra", {
      version: process.env.VERSION,
    });

    scope.setContext("deployment", {
      id: process.env.DEPLOYMENT_ID,
    });

    scope.setContext("function", {
      id: process.env.HANDLER_ID,
      version: process.env.HANDLER_VERSION,
      manifestBucket: process.env.MANIFEST_BUCKET,
      manifestKey: process.env.MANIFEST_PREFIX,
      sourceBucket: process.env.SOURCE_BUCKET,
      sourceKey: process.env.SOURCE_PREFIX,
      mode: process.env.MODE,
      chain: process.env.CHAIN_ID,
    });

    return scope;
  },
});

process.prependListener("uncaughtException", async function (err) {
  const dbUrl = process.env.DB_URL;
  if (!dbUrl) {
    console.error("DB_URL is not set");
    return;
  }
  const db = getDb({ dbUrl: process.env.DB_URL! });
  await db
    .update(schema.deployment)
    .set({ status: "FAILED" })
    .where(eq(schema.deployment.id, process.env.DEPLOYMENT_ID!));
});

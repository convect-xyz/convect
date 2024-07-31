import { getDb, schema } from "@convect-xyz/lib";
import { init } from "@sentry/node";
import { and, eq, inArray, lt, or } from "drizzle-orm";

process.on("uncaughtException", handleFailure);
process.on("unhandledRejection", handleFailure);

const deploymentPromise = getDeployment();

async function getDeployment() {
  const db = getDbInstance();
  return db.query.deployment.findFirst({
    where(fields, operators) {
      return operators.eq(fields.id, process.env.DEPLOYMENT_ID!);
    },
  });
}

async function handleFailure() {
  const deployment = await deploymentPromise;
  if (!deployment) {
    console.error("Deployment not found");
    throw new Error("Deployment not found");
  }

  const db = getDbInstance();
  await db
    .update(schema.deployment)
    .set({ status: "FAILED" })
    .where(
      or(
        eq(schema.deployment.id, process.env.DEPLOYMENT_ID!),
        and(
          lt(schema.deployment.createdAt, deployment?.createdAt),
          inArray(schema.deployment.status, ["PENDING", "RUNNING"])
        )
      )
    );
}

function getDbInstance() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL is not set");
    throw new Error("DATABASE_URL is not set");
  }
  return getDb({ dbUrl });
}

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

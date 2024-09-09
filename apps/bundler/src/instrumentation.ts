import { getDb, schema } from "@convect-xyz/lib";
import { init } from "@sentry/node";
import { and, eq, inArray, lt, or } from "drizzle-orm";
import { getCurrentDeployment } from "./task";

process.on("uncaughtException", handleFailure);
process.on("unhandledRejection", handleFailure);

async function handleFailure() {
  const deployment = await getCurrentDeployment();
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
        eq(schema.deployment.id, deployment.id),
        // All previous deployments for the same handler that are pending
        and(
          eq(schema.deployment.functionId, deployment.functionId),
          lt(schema.deployment.createdAt, deployment.createdAt),
          inArray(schema.deployment.status, ["PENDING"])
        )
      )
    )
    .catch(() => {});
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
    scope.setContext("deployment", {
      initialDeploymentId: process.env.INITIAL_DEPLOYMENT_ID,
    });

    return scope;
  },
});

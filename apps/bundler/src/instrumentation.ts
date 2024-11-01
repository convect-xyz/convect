import { init } from "@sentry/node";
import { getDeploymentTask } from "./task";

process.on("uncaughtException", handleFailure);
process.on("unhandledRejection", handleFailure);

async function handleFailure() {
  const deploymentTask = await getDeploymentTask();
  await deploymentTask.fail();
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

const Sentry: any = require("@sentry/node");
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { env } from "./env";

Sentry.init({
  dsn: "https://c749dc7d2929977538ed3abbd4fbdb4a@o4507692210454528.ingest.de.sentry.io/4507692217729104",
  integrations: [nodeProfilingIntegration()],
  // Performance Monitoring
  tracesSampleRate: 1.0,

  // Set sampling rate for profiling - this is relative to tracesSampleRate
  profilesSampleRate: 1.0,

  // Set initial scope
  initialScope: (scope: any) => {
    scope.setUser({
      id: env.USER_ID,
    });

    scope.setContext("infra", {
      version: env.VERSION,
    });

    scope.setContext("deployment", {
      id: env.DEPLOYMENT_ID,
    });

    scope.setContext("function", {
      id: env.HANDLER_ID,
      version: env.HANDLER_VERSION,
      manifestBucket: env.MANIFEST_BUCKET,
      manifestKey: env.MANIFEST_PREFIX,
      sourceBucket: env.SOURCE_BUCKET,
      sourceKey: env.SOURCE_PREFIX,
      mode: env.MODE,
      chain: env.CHAIN_ID,
    });

    return scope;
  },
});

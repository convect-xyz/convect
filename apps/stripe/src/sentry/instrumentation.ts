import { init } from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

init({
  dsn: process.env.SENTRY_DSN,
  integrations: [nodeProfilingIntegration()],
  // Tracing must be enabled for profiling to work
  tracesSampleRate: 1.0,
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
  // Set initial scope
  initialScope: (scope) => {
    scope.setContext("branch_name", {
      branchName: process.env.BRANCH_NAME,
    });

    return scope;
  },
});

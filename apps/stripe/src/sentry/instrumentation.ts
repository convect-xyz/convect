import { init } from "@sentry/node";

init({
  dsn: process.env.SENTRY_DSN,
  integrations: [],
  // Performance Monitoring
  tracesSampleRate: 1.0,

  // Set sampling rate for profiling - this is relative to tracesSampleRate
  profilesSampleRate: 1.0,

  // Set initial scope
  initialScope: (scope) => {
    scope.setContext("branch_name", {
      branchName: process.env.BRANCH_NAME,
    });

    return scope;
  },
});

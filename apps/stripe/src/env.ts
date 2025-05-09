import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    STRIPE_API_KEY: z.string().min(1),
    DATABASE_URL: z.string().min(1),
    SENTRY_DSN: z.string().min(1),
    BRANCH_NAME: z.string().min(1),
    RESEND_API_KEY: z.string().min(1),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  isServer: true,
});

import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    CURR_DIR: z.string().min(1),
    INITIAL_DEPLOYMENT_ID: z.string().min(1),
    ENV_DECRYPTION_KEY: z.string().min(1),
    REPORTING_DB_URL: z.string().min(1),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  isServer: true,
});

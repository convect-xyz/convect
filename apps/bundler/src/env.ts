import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    MODE: z.enum(["init", "update", "destroy"]),
    VERSION: z.string(),
    CURR_DIR: z.string().min(1),
    DEPLOYMENT_ID: z.string().min(1),
    HANDLER_ID: z.string().min(1),
    HANDLER_VERSION: z.string(),
    SOURCE_BUCKET: z.string(),
    SOURCE_PREFIX: z.string(),
    STRIPE_CUSTOMER_ID: z.string(),
    HANDLER_ENVS: z.string(),
    CHAIN_SNS: z.string(),
    POLLING_URL: z.string(),
    MANIFEST_PREFIX: z.string(),
    MANIFEST_BUCKET: z.string(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});

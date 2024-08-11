import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const modeSchema = z.enum(["init", "update", "destroy"]);
const chainConfigSchema = z.array(
  z.object({ chainId: z.number(), pollingUrl: z.string() })
);

const modeRequired =
  <T>(modes: Array<z.infer<typeof modeSchema>>) =>
  (val?: T): val is T => {
    if (modes.includes(modeSchema.parse(process.env.MODE)) && !val) {
      throw new Error(`Undefined value in ${process.env.MODE}`);
    }

    return true;
  };

export const env = createEnv({
  server: {
    DATABASE_URL: z
      .string()
      .optional()
      .refine(modeRequired(["init", "update"])),
    MODE: modeSchema,
    VERSION: z.string(),
    CURR_DIR: z.string().min(1),
    DEPLOYMENT_ID: z
      .string()
      .min(1)
      .optional()
      .refine(modeRequired(["init", "update"])),
    HANDLER_ID: z.string().min(1),
    HANDLER_VERSION: z.string(),
    SOURCE_BUCKET: z
      .string()
      .optional()
      .refine(modeRequired(["init", "update"])),
    SOURCE_PREFIX: z
      .string()
      .optional()
      .refine(modeRequired(["init", "update"])),
    STRIPE_CUSTOMER_ID: z
      .string()
      .optional()
      .refine(modeRequired(["init", "update"])),
    USER_ID: z
      .string()
      .optional()
      .refine(modeRequired(["init", "update"])),
    HANDLER_ENVS: z
      .string()
      .optional()
      .refine(modeRequired(["init", "update"])),
    MANIFEST_PREFIX: z
      .string()
      .optional()
      .refine(modeRequired(["init", "update"])),
    MANIFEST_BUCKET: z
      .string()
      .optional()
      .refine(modeRequired(["init", "update"])),
    ETHERSCAN_LIKE: z
      .string()
      .optional()
      .refine(modeRequired(["init", "update"])),
    ETHERSCAN_API_KEY: z
      .string()
      .optional()
      .refine(modeRequired(["init", "update"])),
    CHAINS: z.string().transform((v) => chainConfigSchema.parse(JSON.parse(v))),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  isServer: true,
});

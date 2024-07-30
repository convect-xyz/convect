import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const modeSchema = z.enum(["init", "update", "destroy"]);

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
    DATABASE_URL: z.string(),
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
    CHAIN_SNS: z
      .string()
      .optional()
      .refine(modeRequired(["init", "update"])),
    CHAIN_ID: z.coerce
      .number()
      .optional()
      .refine(modeRequired(["init", "update"])),
    POLLING_URL: z
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
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  isServer: true,
});

import { z } from "zod";

export const configSchema = z.object({
  reportingDbUrl: z.string(),
  pulumiAccessToken: z.string(),
  stripeApiKey: z.string(),
  tinybirdApiKey: z.string(),
  chains: z.any(),
  redis: z.object({
    url: z.string(),
  }),
});

export type ConfigSchema = z.infer<typeof configSchema>;

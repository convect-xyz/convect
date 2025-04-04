import { z } from "zod";

export const configSchema = z.object({
  reporting: z.object({
    dbUrl: z.string(),
  }),
  pulumi: z.object({
    accessToken: z.string(),
  }),
  stripe: z.object({
    apiKey: z.string(),
  }),
  tinybird: z.object({
    apiKey: z.string(),
  }),
  chains: z.any(),
  redis: z.object({
    url: z.string(),
  }),
});

export type ConfigSchema = z.infer<typeof configSchema>;

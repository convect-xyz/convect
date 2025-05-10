import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z
      .string()
      .url()
      .refine(
        (str) => !str.includes("YOUR_MYSQL_URL_HERE"),
        "You forgot to change the default URL",
      ),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
    AUTH_GITHUB_ID: z.string(),
    AUTH_GITHUB_SECRET: z.string(),

    GITHUB_APP_ID: z.string(),
    GITHUB_CLIENT_ID: z.string(),
    GITHUB_CLIENT_SECRET: z.string(),
    GITHUB_PRIVATE_KEY: z.string(),

    AWS_REGION: z.string(),
    AWS_ACCOUNT_ID: z.string(),
    AWS_ACCESS_KEY_ID: z.string(),
    AWS_SECRET_ACCESS_KEY: z.string(),

    ENCRYPTION_KEY: z.string(),

    VERSION: z.string(),

    PULUMI_ACCESS_TOKEN: z.string(),

    STRIPE_API_KEY: z.string(),

    REPORTING_DATABASE_URL: z.string(),

    RESEND_API_KEY: z.string(),

    PLAN_ENVIRONMENT: z.enum(["prod", "test"]),
    CLOUDFRONT_PRIVATE_KEY: z.string(),
    CLOUDFRONT_KEY_PAIR_ID: z.string(),
    CLOUDFRONT_PLANS_URL: z.string(),

    STRIPE_ENVIRONMENT: z.enum(["live", "test"]),
  },
  client: {
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_GITHUB_ID: process.env.AUTH_GITHUB_ID,
    AUTH_GITHUB_SECRET: process.env.AUTH_GITHUB_SECRET,
    GITHUB_APP_ID: process.env.GITHUB_APP_ID,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    GITHUB_PRIVATE_KEY: process.env.GITHUB_PRIVATE_KEY,
    AWS_REGION: process.env.AWS_REGION,
    AWS_ACCOUNT_ID: process.env.AWS_ACCOUNT_ID,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    VERSION: process.env.VERSION,
    PULUMI_ACCESS_TOKEN: process.env.PULUMI_ACCESS_TOKEN,
    STRIPE_API_KEY: process.env.STRIPE_API_KEY,
    REPORTING_DATABASE_URL: process.env.REPORTING_DATABASE_URL,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    PLAN_ENVIRONMENT: process.env.PLAN_ENVIRONMENT,
    CLOUDFRONT_PRIVATE_KEY: process.env.CLOUDFRONT_PRIVATE_KEY,
    CLOUDFRONT_KEY_PAIR_ID: process.env.CLOUDFRONT_KEY_PAIR_ID,
    CLOUDFRONT_PLANS_URL: process.env.CLOUDFRONT_PLANS_URL,
    STRIPE_ENVIRONMENT: process.env.STRIPE_ENVIRONMENT,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});

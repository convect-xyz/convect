import { chains } from "./chains";

export default {
  reportingDbUrl: process.env.PROD_REPORTING_DB_URL,
  pulumiAccessToken: process.env.PULUMI_ACCESS_TOKEN,
  stripeApiKey: process.env.PROD_STRIPE_API_KEY!,
  tinybirdApiKey: process.env.TINYBIRD_API_KEY,
  redis: {
    url: process.env.REDIS_URL,
  },
  chains,
};

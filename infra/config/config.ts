import { chains } from "./chains";
import { configSchema } from "./schema";

export default configSchema.parse({
  reporting: {
    dbUrl: process.env.PROD_REPORTING_DB_URL!,
  },
  pulumi: {
    accessToken: process.env.PULUMI_ACCESS_TOKEN!,
  },
  stripe: {
    apiKey: process.env.STRIPE_API_KEY!,
  },
  tinybird: {
    apiKey: process.env.TINYBIRD_API_KEY!,
  },
  redis: {
    url: process.env.CONFIG__REDIS__URL!,
  },
  chains,
});

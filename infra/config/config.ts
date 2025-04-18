import { chains } from "./chains";
import { configSchema } from "./schema";

function getStripeApiKey(): string {
  console.log(process.env.PROD_REPORTING_DB_URL);
  switch (process.env.INFRA_VERSION) {
    case "infra-v1":
      return process.env.PROD_STRIPE_API_KEY!;
    case "infra-dev":
      return process.env.TEST_STRIPE_API_KEY!;
    default:
      throw new Error("Unknown infra version");
  }
}

export default configSchema.parse({
  reporting: {
    dbUrl: process.env.PROD_REPORTING_DB_URL!,
  },
  pulumi: {
    accessToken: process.env.PULUMI_ACCESS_TOKEN!,
  },
  stripe: {
    apiKey: getStripeApiKey(),
  },
  tinybird: {
    apiKey: process.env.TINYBIRD_API_KEY!,
  },
  redis: {
    url: process.env.CONFIG__REDIS__URL!,
  },
  chains,
});

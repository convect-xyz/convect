import "dotenv/config";
import SmeeClient from "smee-client";

const smee = new SmeeClient({
  source: process.env.REPOSITORY_WEBHOOK_RECEIVER_URL!,
  target: "http://localhost:3000/api/github/webhooks",
  logger: console,
});

smee.start();

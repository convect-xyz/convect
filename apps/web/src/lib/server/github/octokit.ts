import { App } from "octokit";
import { env } from "~/env";

export const app = new App({
  appId: env.GITHUB_CLIENT_ID,
  privateKey: env.GITHUB_PRIVATE_KEY,
});

import axios from "axios";
import { env } from "~/env";

export const pulumiAxios = axios.create({
  headers: {
    Accept: "application/vnd.pulumi+8",
    "Content-Type": "application/json",
    Authorization: `token ${env.PULUMI_ACCESS_TOKEN}`,
  },
  baseURL: "https://api.pulumi.com",
});

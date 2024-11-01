import { createPublicClient, defineChain, http } from "viem";

import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const chains = JSON.parse(
  fs
    .readFileSync(path.join(__dirname, "../../../../../../config/chains.json"))
    .toString(),
);

export function getPublicClient(chainId: number) {
  const chain = chains.find((c: any) => c.id === chainId);
  return createPublicClient({
    chain: defineChain({
      id: chainId,
      name: "",
      nativeCurrency: {
        name: "",
        symbol: "",
        decimals: 0,
      },
      rpcUrls: {
        default: {
          http: [],
          webSocket: undefined,
        },
      },
    }),
    transport: http(chain.polling_urls[0]),
  });
}

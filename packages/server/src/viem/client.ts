import { createPublicClient, defineChain, http } from "viem";
import { chains } from "@infra/config";

export function getPublicClient(chainId: number) {
  const chain = chains.find((c) => c.id === chainId)!;
  return createPublicClient({
    chain: defineChain({
      id: chainId,
      name: chain.name,
      nativeCurrency: {
        name: "",
        symbol: "",
        decimals: 0,
      },
      rpcUrls: {
        default: {
          http: chain.polling_urls,
          webSocket: undefined,
        },
      },
    }),
    transport: http(chain.polling_urls[0]),
  });
}

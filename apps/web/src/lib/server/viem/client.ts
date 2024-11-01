import { createPublicClient, defineChain, http } from "viem";
import chains from "../../../../../../config/chains.json";

export function getPublicClient(chainId: number) {
  const chain = chains.find((c) => c.id === chainId)!;
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

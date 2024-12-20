import { createConfig, http, Transport } from "wagmi";
import { blast, Chain, mainnet } from "wagmi/chains";

export const nodes = [
  {
    name: "Ethereum Mainnet",
    alchemyUrl:
      "https://eth-mainnet.g.alchemy.com/v2/FI_nQzZX2RUOkr0-ypStCGnT5ucYpHrd",
    convectUrl: "http://eth-mainnet.rpc.convect.xyz",
    chain: mainnet,
  } as const,
  {
    name: "Blast Mainnet",
    alchemyUrl:
      "https://blast-mainnet.g.alchemy.com/v2/FI_nQzZX2RUOkr0-ypStCGnT5ucYpHrd",
    convectUrl: "http://blast-mainnet.rpc.convect.xyz",
    chain: blast,
  } as const,
];

export const alchemyConfig = createConfig({
  chains: nodes.map((node) => node.chain) as unknown as [Chain, ...Chain[]],
  transports: nodes
    .map((node) => ({
      chainId: node.chain.id,
      url: node.alchemyUrl,
    }))
    .reduce(
      (acc, curr) => {
        acc[curr.chainId] = http(curr.url);
        return acc;
      },
      {} as Record<number, Transport>,
    ),
});

export const convectConfig = createConfig({
  chains: nodes.map((node) => node.chain) as unknown as [Chain, ...Chain[]],
  transports: nodes
    .map((node) => ({
      chainId: node.chain.id,
      url: node.convectUrl,
    }))
    .reduce(
      (acc, curr) => {
        acc[curr.chainId] = http(curr.url);
        return acc;
      },
      {} as Record<number, Transport>,
    ),
});

console.log(convectConfig);

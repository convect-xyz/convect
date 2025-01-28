import { createConfig, http, Transport } from "wagmi";
import {
  base,
  baseSepolia,
  blast,
  blastSepolia,
  Chain,
  mainnet,
  sepolia,
} from "wagmi/chains";

export const nodes = [
  {
    name: "Ethereum Mainnet",
    alchemyUrl:
      "https://eth-mainnet.g.alchemy.com/v2/FI_nQzZX2RUOkr0-ypStCGnT5ucYpHrd",
    convectUrl: "http://eth-mainnet.rpc.convect.xyz",
    chain: mainnet,
  } as const,
  {
    name: "Ethereum Sepolia",
    alchemyUrl:
      "https://eth-sepolia.g.alchemy.com/v2/xlCz0CxtG7gSJxrjG-YMvjQVfUfRQhKI",
    convectUrl: "http://eth-sepolia.rpc.convect.xyz",
    chain: sepolia,
  } as const,
  {
    name: "Blast Mainnet",
    alchemyUrl:
      "https://blast-mainnet.g.alchemy.com/v2/FI_nQzZX2RUOkr0-ypStCGnT5ucYpHrd",
    convectUrl: "http://blast-mainnet.rpc.convect.xyz",
    chain: blast,
  } as const,
  {
    name: "Blast Sepolia",
    alchemyUrl:
      "https://blast-sepolia.g.alchemy.com/v2/FI_nQzZX2RUOkr0-ypStCGnT5ucYpHrd",
    convectUrl: "http://blast-sepolia.rpc.convect.xyz",
    chain: blastSepolia,
  } as const,
  {
    name: "Base Mainnet",

    alchemyUrl:
      "https://base-mainnet.g.alchemy.com/v2/Oqs6RK2wmknw_xrTY8wNy50ocMc5nA6l",
    convectUrl: "http://base-mainnet.rpc.convect.xyz",
    chain: base,
  },
  {
    name: "Base Sepolia",

    alchemyUrl:
      "https://base-sepolia.g.alchemy.com/v2/Oqs6RK2wmknw_xrTY8wNy50ocMc5nA6l",
    convectUrl: "http://base-sepolia.rpc.convect.xyz",
    chain: baseSepolia,
  },
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

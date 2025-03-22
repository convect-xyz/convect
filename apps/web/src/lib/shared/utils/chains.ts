import { extractChain } from "viem";
import * as chains from "viem/chains";

export function getViemChainById(chainId: number) {
  return extractChain({
    chains: Object.values(chains),
    id: chainId as any,
  });
}

export function getExplorerUrl(chainId: number) {
  const chain = getViemChainById(chainId);
  return chain.blockExplorers?.default.url;
}

export function getExplorerTxUrl(chainId: number, txHash: string) {
  const explorerUrl = getExplorerUrl(chainId);
  if (!explorerUrl) {
    return null;
  }
  return `${explorerUrl}/tx/${txHash}`;
}

export function getExplorerAddressUrl(chainId: number, address: string) {
  const explorerUrl = getExplorerUrl(chainId);
  if (!explorerUrl) {
    return null;
  }
  return `${explorerUrl}/address/${address}`;
}

export function getExplorerBlockUrl(chainId: number, blockNumber: number) {
  const explorerUrl = getExplorerUrl(chainId);
  if (!explorerUrl) {
    throw new Error("No explorer URL found for chain ID");
  }
  return `${explorerUrl}/block/${blockNumber}`;
}

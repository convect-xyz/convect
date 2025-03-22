import { api } from "~/trpc/react";
import { DASHBOARD_REFETCH_INTERVAL } from "./constants";
import { useParams } from "./useParams";
import { useSelectedChainId } from "./useSelectedChainId";
import { useSelectedDeploymentId } from "./useSelectedDeploymentId";

export function useTransaction(options?: { transactionHash?: string }) {
  const { functionId } = useParams();
  const deploymentId = useSelectedDeploymentId();
  const chainId = useSelectedChainId();
  const transactionHash = options?.transactionHash;

  return api.functions.getTransaction.useQuery(
    {
      functionId: functionId ?? -1,
      chainId: chainId ?? -1,
      deploymentId: deploymentId ?? "",
      transactionHash: transactionHash ?? "",
    },
    {
      refetchInterval: DASHBOARD_REFETCH_INTERVAL,
      enabled: !!chainId && !!functionId && !!transactionHash && !!deploymentId,
    },
  );
}

import { api } from "~/trpc/react";
import { DASHBOARD_REFETCH_INTERVAL } from "./constants";
import { useParams } from "./useParams";
import { useSelectedChainId } from "./useSelectedChainId";
import { useSelectedDeploymentId } from "./useSelectedDeploymentId";

export function useBatches() {
  const { functionId } = useParams();
  const deploymentId = useSelectedDeploymentId();
  const chainId = useSelectedChainId();

  return api.functions.getBatches.useInfiniteQuery(
    {
      functionId: functionId ?? -1,
      chainId: chainId ?? -1,
      deploymentId: deploymentId ?? "",
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      refetchInterval: DASHBOARD_REFETCH_INTERVAL,
      enabled: !!chainId && !!functionId,
    },
  );
}

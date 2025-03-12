import { api } from "~/trpc/react";
import { useTransactionFilters } from "../filters";
import { DASHBOARD_REFETCH_INTERVAL } from "./constants";
import { useParams } from "./useParams";
import { useSelectedChainId } from "./useSelectedChainId";
import { useSelectedDeploymentId } from "./useSelectedDeploymentId";

export function useTransactions() {
  const filters = useTransactionFilters();
  const { functionId } = useParams();
  const deploymentId = useSelectedDeploymentId();
  const chainId = useSelectedChainId();

  return api.functions.getTransactions.useInfiniteQuery(
    {
      functionId: functionId ?? -1,
      chainId: chainId ?? -1,
      deploymentId: deploymentId ?? "",
      search: filters.debouncedSearch,
      status: filters.status,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      refetchInterval: DASHBOARD_REFETCH_INTERVAL,
      enabled: !!chainId && !!functionId,
    },
  );
}

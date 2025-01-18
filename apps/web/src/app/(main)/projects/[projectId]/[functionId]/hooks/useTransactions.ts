import { api } from "~/trpc/react";
import { useTransactionFilters } from "../filters";
import { DASHBOARD_REFETCH_INTERVAL } from "./constants";
import { useParams } from "./useParams";
import { useSelectedDeploymentId } from "./useSelectedDeploymentId";

export function useTransactions() {
  const filters = useTransactionFilters();
  const { functionId, chainId } = useParams();
  const deploymentId = useSelectedDeploymentId();

  return api.functions.getTransactions.useQuery(
    {
      functionId: functionId ?? -1,
      chainId: chainId ?? -1,
      deploymentId: deploymentId ?? "",
      search: filters.debouncedSearch,
      status: filters.status,
    },
    {
      refetchInterval: DASHBOARD_REFETCH_INTERVAL,
      enabled: !!chainId && !!functionId,
    },
  );
}

import { api } from "~/trpc/react";
import { useParams } from "../../hooks/useParams";
import { useSelectedChainId } from "../../hooks/useSelectedChainId";
import { useSelectedDeploymentId } from "../../hooks/useSelectedDeploymentId";
import { useFilters } from "../filtersContext";

export function useLogs() {
  const { functionId } = useParams();
  const chainId = useSelectedChainId();
  const deploymentId = useSelectedDeploymentId();
  const { logLevel } = useFilters();

  return api.functions.getLogs.useQuery(
    {
      chainId: chainId ?? -1,
      functionId: functionId,
      deploymentId: deploymentId ?? "",
      logLevel,
    },
    {
      enabled: !!chainId && !!deploymentId,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    },
  );
}

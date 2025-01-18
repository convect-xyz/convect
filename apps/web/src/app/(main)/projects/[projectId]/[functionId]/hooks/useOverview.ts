import { millisecondsToMinutes } from "date-fns";
import { api } from "~/trpc/react";
import { DASHBOARD_REFETCH_INTERVAL } from "./constants";
import { useParams } from "./useParams";
import { useSelectedDeploymentId } from "./useSelectedDeploymentId";

export function useOverview() {
  const { chainId, functionId } = useParams();
  const deploymentId = useSelectedDeploymentId();

  return api.functions.getOverview.useQuery(
    {
      functionId: functionId ?? -1,
      chainId: chainId ?? -1,
      deploymentId: deploymentId ?? "",
    },
    {
      enabled: !!functionId && !!chainId && !!deploymentId,
      refetchInterval: DASHBOARD_REFETCH_INTERVAL,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      select(data) {
        const mins = millisecondsToMinutes(data.avgDuration);
        const secs = (data.avgDuration / 1000).toFixed(1);

        return {
          ...data,
          avgDurationParsed: {
            mins,
            secs,
          },
        };
      },
    },
  );
}

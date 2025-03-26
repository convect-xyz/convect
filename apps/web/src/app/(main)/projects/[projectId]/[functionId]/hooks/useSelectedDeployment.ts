import { api } from "~/trpc/react";
import { useSelectedDeploymentId } from "./useSelectedDeploymentId";

export function useSelectedDeployment() {
  const deploymentId = useSelectedDeploymentId();
  return api.functions.getDeployment.useQuery(
    {
      deploymentId: deploymentId ?? "",
    },
    {
      enabled: !!deploymentId,
    },
  );
}

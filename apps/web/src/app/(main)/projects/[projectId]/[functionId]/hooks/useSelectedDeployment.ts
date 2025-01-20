import { useFunction } from "./useFunction";
import { useSelectedDeploymentId } from "./useSelectedDeploymentId";

export function useSelectedDeployment() {
  const deploymentId = useSelectedDeploymentId();
  return useFunction({
    select: (data) => {
      return data.activeDeployments.find((d) => d.id === deploymentId);
    },
  });
}

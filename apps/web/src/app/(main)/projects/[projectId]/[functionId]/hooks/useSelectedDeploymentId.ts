import { useFunction } from "./useFunction";
import { useParams } from "./useParams";

export function useSelectedDeploymentId() {
  const { deploymentId } = useParams();
  const { data: fn } = useFunction();
  return deploymentId || (fn?.activeDeployments[0]?.id ?? null);
}

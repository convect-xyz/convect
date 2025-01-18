import { useFunction } from "./useFunction";
import { useParams } from "./useParams";
import { useSelectedDeploymentId } from "./useSelectedDeploymentId";

export function useSelectedChainId() {
  const { chainId } = useParams();
  const selectedDeploymentId = useSelectedDeploymentId();
  const { data: fn } = useFunction();

  return (
    chainId ??
    fn?.activeDeployments.find((d) => d.id === selectedDeploymentId)?.chains[0]
      ?.chainId ??
    null
  );
}

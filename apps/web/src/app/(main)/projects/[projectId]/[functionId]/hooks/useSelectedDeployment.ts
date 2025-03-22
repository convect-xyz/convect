import { api } from "~/trpc/react";
import { useParams } from "./useParams";
import { useSelectedDeploymentId } from "./useSelectedDeploymentId";

export function useSelectedDeployment() {
  const { functionId } = useParams();
  const deploymentId = useSelectedDeploymentId();
  return api.functions.getDeployment.useQuery(
    {
      functionId: functionId ?? -1,
      deploymentId: deploymentId ?? "",
    },
    {
      enabled: !!functionId && !!deploymentId,
    },
  );
}

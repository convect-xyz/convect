import { api } from "~/trpc/react";
import { useParams } from "./useParams";

export function useSelectedDeploymentId() {
  const { deploymentId, projectId, functionId } = useParams();
  const { data: fn } = api.functions.get.useQuery({
    projectId: projectId,
    functionId: functionId,
  });
  return deploymentId || (fn?.activeDeployments[0]?.id ?? null);
}

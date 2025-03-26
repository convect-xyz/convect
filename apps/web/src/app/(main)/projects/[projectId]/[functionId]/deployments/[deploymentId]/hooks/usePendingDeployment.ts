import { api } from "~/trpc/react";
import { useParams } from "./useParams";

export function usePendingDeployment() {
  const { deploymentId } = useParams();

  return api.functions.getDeployment.useQuery({
    deploymentId,
  });
}

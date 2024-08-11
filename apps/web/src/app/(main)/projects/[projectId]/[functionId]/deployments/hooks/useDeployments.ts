import { api } from "~/trpc/react";
import { useParams } from "../../hooks/useParams";

export function useDeployments() {
  const { functionId } = useParams();

  return api.functions.getDeployments.useQuery(
    {
      functionId: functionId ?? -1,
    },
    {
      enabled: !!functionId,
    },
  );
}

import { api } from "~/trpc/react";
import { useParams } from "../../hooks/useParams";

export function useDeployments() {
  const { handlerId } = useParams();

  return api.handlers.getDeployments.useQuery(
    {
      handlerId: handlerId ?? -1,
    },
    {
      enabled: !!handlerId,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    },
  );
}

import { api } from "~/trpc/react";
import { useParams } from "../../hooks/useParams";

export function useDeployments() {
  const { functionId } = useParams();

  return api.functions.getDeployments.useInfiniteQuery(
    {
      functionId: functionId ?? -1,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      enabled: !!functionId,
    },
  );
}

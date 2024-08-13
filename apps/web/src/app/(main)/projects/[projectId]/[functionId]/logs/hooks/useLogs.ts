import { api } from "~/trpc/react";
import { useParams } from "../../hooks/useParams";
import { useFilters } from "../filters";

export function useLogs() {
  const { chainId, functionId } = useParams();
  const { logLevel } = useFilters();
  return api.functions.getLogs.useQuery(
    {
      chainId: chainId ?? -1,
      functionId: functionId,
      logLevel,
    },
    {
      enabled: !!chainId,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    },
  );
}

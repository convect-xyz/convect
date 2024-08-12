import { api } from "~/trpc/react";
import { useParams } from "../../hooks/useParams";
import { useFilters } from "../filters";

export function useLogs() {
  const { chainId: handlerId } = useParams();
  const { logLevel } = useFilters();
  return api.handlers.getLogs.useQuery(
    {
      handlerId: handlerId ?? -1,
      logLevel,
    },
    {
      enabled: !!handlerId,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    },
  );
}

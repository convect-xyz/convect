import { api } from "~/trpc/react";
import { useParams } from "../../hooks/useParams";
import { useFilters } from "../filters";

export function useLogs() {
  const { handlerId } = useParams();
  const { logLevel } = useFilters();
  return api.handlers.getLogs.useQuery(
    {
      handlerId: Number(handlerId),
      logLevel,
    },
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    },
  );
}

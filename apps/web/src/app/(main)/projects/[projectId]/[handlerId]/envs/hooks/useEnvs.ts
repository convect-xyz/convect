import { api } from "~/trpc/react";
import { useParams } from "../../hooks/useParams";

export function useEnvs() {
  const { handlerId } = useParams();
  return api.handlers.getEnvs.useQuery({
    handlerId: Number(handlerId),
  });
}

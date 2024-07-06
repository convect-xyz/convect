import { api } from "~/trpc/react";
import { useParams } from "../../hooks/useParams";

export function useEnvs() {
  const { functionId } = useParams();
  return api.functions.getEnvs.useQuery({
    functionId: Number(functionId),
  });
}

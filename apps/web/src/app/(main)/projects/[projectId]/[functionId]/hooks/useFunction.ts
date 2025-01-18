import { api } from "~/trpc/react";
import { useParams } from "./useParams";

export function useFunction() {
  const { functionId, projectId } = useParams();
  return api.functions.get.useQuery({
    projectId: projectId,
    functionId: functionId,
  });
}

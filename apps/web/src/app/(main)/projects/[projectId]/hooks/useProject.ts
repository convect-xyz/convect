import { api } from "~/trpc/react";
import { useParams } from "./useParams";

export function useProject() {
  const { projectId } = useParams();
  return api.project.getProjectById.useQuery({
    id: projectId,
  });
}

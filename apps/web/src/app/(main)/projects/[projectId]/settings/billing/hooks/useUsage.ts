import { endOfMonth, startOfMonth } from "date-fns";
import { api } from "~/trpc/react";
import { useParams } from "../../../hooks/useParams";

export function useUsage() {
  const { projectId } = useParams();
  return api.project.getUsage.useQuery({
    projectId,
    periodStart: startOfMonth(new Date()).getTime(),
    periodEnd: endOfMonth(new Date()).getTime(),
  });
}

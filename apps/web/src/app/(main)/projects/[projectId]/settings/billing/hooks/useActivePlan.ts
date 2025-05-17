import { api } from "~/trpc/react";
import { useParams } from "../../../hooks/useParams";

export function useActivePlan() {
  const { projectId } = useParams();
  return api.project.getActivePlan.useQuery(
    {
      projectId,
    },
    {
      refetchInterval: 1000 * 5,
      select: (data) => ({
        ...data,
        isActive: (plan: "BASE" | "HOBBY" | "PRO" | "ENTERPRISE") =>
          data.name === plan,
      }),
    },
  );
}

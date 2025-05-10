import { api } from "~/trpc/react";

export function useAdminProject(projectId?: number) {
  return api.admin.getProject.useQuery(
    { projectId: projectId ?? -1 },
    {
      enabled: !!projectId,

      select(data) {
        return {
          ...data,
          isEditable: data.planType === "HOBBY" || data.planType === "PRO",
        };
      },
    },
  );
}

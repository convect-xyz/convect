import { api } from "~/trpc/react";
import { useParams } from "./useParams";

export function useDeployment() {
  const { deploymentId } = useParams();

  return api.functions.getDeployment.useQuery(
    {
      deploymentId,
    },
    {
      select: (data) => {
        return {
          ...data,
          deployment: {
            ...data.deployment,
            isWaitingForApproval:
              data.deployment.status === "WAITING_FOR_APPROVAL",
          },
        };
      },
    },
  );
}

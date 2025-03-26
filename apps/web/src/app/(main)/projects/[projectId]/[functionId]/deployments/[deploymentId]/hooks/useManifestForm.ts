import { manifestSchema } from "@convect-xyz/lib";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { usePendingDeployment } from "./usePendingDeployment";

export function useManifestForm() {
  const { data: deployment } = usePendingDeployment();
  return useForm({
    resolver: zodResolver(manifestSchema),
    defaultValues() {
      return new Promise((resolve) => {
        if (deployment) {
          resolve(deployment.deployment.manifest);
        }
      });
    },
  });
}

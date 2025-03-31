import { Manifest, manifestSchema } from "@convect-xyz/lib";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFormContext } from "react-hook-form";
import { usePendingDeployment } from "./usePendingDeployment";

export function useManifestForm() {
  const { refetch } = usePendingDeployment();
  return useForm<Manifest>({
    resolver: zodResolver(manifestSchema),
    async defaultValues() {
      const result = await refetch();
      if (!result.data) {
        throw new Error("Failed to fetch deployment");
      }

      return result.data.deployment.manifest;
    },
  });
}

export function useManifestFormContext() {
  return useFormContext<Manifest>();
}

export function useManifestFormHelpers() {
  const form = useFormContext<Manifest>();

  return {
    txConfigs: {
      setStartBlock(index: number, chainId: number, value: number | string) {
        if (typeof value === "string" && Number.isNaN(Number(value))) {
          return;
        }

        form.setValue(
          `tx_configs.${index}.start_block.${chainId.toString()}`,
          typeof value === "string" ? Number(value) : value,
        );
      },
      watchStartBlock(index: number, chainId: number) {
        return form.watch().tx_configs?.[index]?.start_block?.[chainId];
      },
    },
  };
}

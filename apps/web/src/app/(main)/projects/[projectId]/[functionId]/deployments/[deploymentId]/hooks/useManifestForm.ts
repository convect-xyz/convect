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
    backfill: {
      getBackfill(chainId: number) {
        return form.watch().chains?.find((c) => c.chainId === chainId)
          ?.backfill;
      },
      setBackfill(chainId: number, value: boolean) {
        const chainIdx = form
          .getValues()
          .chains.findIndex((c) => c.chainId === chainId);
        if (chainIdx === -1) {
          return;
        }

        if (value) {
          form.setValue(`chains.${chainIdx}.backfill`, {
            start_block:
              form.getValues().tx_configs.reduce(
                (acc, txConfig) => {
                  const startBlock = txConfig.start_block[chainId.toString()]!;
                  if (!acc || startBlock < acc) {
                    acc = startBlock;
                  }
                  return acc;
                },
                null as number | null,
              ) ?? 0,
          });
        } else {
          form.setValue(`chains.${chainIdx}.backfill`, undefined);
        }
      },
      getStartBlock(chainId: number) {
        return form.watch().chains?.find((c) => c.chainId === chainId)?.backfill
          ?.start_block;
      },
      setStartBlock(chainId: number, value: number | string) {
        if (typeof value === "string" && Number.isNaN(Number(value))) {
          return;
        }

        form.setValue(
          `chains.${chainId}.backfill.start_block`,
          typeof value === "string" ? Number(value) : value,
        );
      },
    },
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

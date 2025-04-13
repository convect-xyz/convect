import { Manifest, manifestSchema } from "@convect-xyz/lib";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFormContext } from "react-hook-form";
import { useDeployment } from "./usePendingDeployment";

export function useManifestForm() {
  const { refetch } = useDeployment();
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

  function _findChain(chainId: number) {
    const chainIdx = form
      .watch()
      .chains.findIndex((c) => c.chainId === chainId);

    return {
      chainIdx,
      chain: form.watch().chains[chainIdx],
    };
  }

  function _getMinContractCreationBlock(chainId: number) {
    return form.watch().tx_configs.reduce(
      (acc, txConfig) => {
        const startBlock = txConfig.start_block[chainId.toString()]!;
        if (!acc || startBlock < acc) {
          acc = startBlock;
        }
        return acc;
      },
      null as number | null,
    );
  }

  return {
    backfill: {
      toggleStartBlock(chainId: number) {
        const { chain, chainIdx } = _findChain(chainId);

        const currentStartBlock = chain?.start_block;
        if (currentStartBlock === undefined) {
          form.setValue(
            `chains.${chainIdx}.start_block`,
            _getMinContractCreationBlock(chainId) ?? 0,
          );
        } else {
          form.setValue(`chains.${chainIdx}.start_block`, undefined);
        }
      },
      toggleEndBlock(chainId: number) {
        const { chain, chainIdx } = _findChain(chainId);

        const currentEndBlock = chain?.end_block;
        if (currentEndBlock === undefined) {
          form.setValue(
            `chains.${chainIdx}.end_block`,
            _getMinContractCreationBlock(chainId) ?? 0,
          );
        } else {
          form.setValue(`chains.${chainIdx}.end_block`, undefined);
        }
      },
      watchStartBlock(chainId: number) {
        const { chain } = _findChain(chainId);
        return chain?.start_block;
      },
      setStartBlock(chainId: number, value: number | string) {
        const { chainIdx } = _findChain(chainId);
        if (typeof value === "string" && Number.isNaN(Number(value))) {
          return;
        }
        form.setValue(
          `chains.${chainIdx}.start_block`,
          typeof value === "string" ? Number(value) : value,
        );
      },
      watchEndBlock(chainId: number) {
        const { chain } = _findChain(chainId);
        return chain?.end_block;
      },
      setEndBlock(chainId: number, value: number | string) {
        const { chainIdx } = _findChain(chainId);
        if (typeof value === "string" && Number.isNaN(Number(value))) {
          return;
        }
        form.setValue(
          `chains.${chainIdx}.end_block`,
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

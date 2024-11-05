import { z } from "zod";

export type Manifest = z.infer<typeof manifestSchema>;
export type StructuredManifest = ReturnType<typeof getStructuredManifest>;

type AbiParameter = z.infer<typeof baseAbiParameter> & {
  components?: AbiParameter[];
};

const baseAbiParameter = z.object({
  type: z.string(),
  name: z.string().optional(),
  internalType: z.string().optional(),
  indexed: z.boolean().optional(),
});

const abiParameter: z.ZodType<AbiParameter> = baseAbiParameter.extend({
  components: z.lazy(() => abiParameter.array().optional()),
});

export const manifestSchema = z.object({
  chains: z.array(
    z.object({
      chainId: z.number(),
      name: z.string(),
    })
  ),
  tx_configs: z.array(
    z.object({
      name: z.string().default("default"),
      start_block: z.record(z.number()),
      chains: z.array(z.number()).optional(),
    })
  ),
  log_configs: z.array(
    z.object({
      address: z.string().or(z.record(z.string())),
      topics: z.array(z.string()),
      tx_configs: z.array(z.number()),
      abi: z.object({
        type: z.literal("event"),
        anonymous: z.boolean().optional(),
        inputs: z.array(abiParameter),
        name: z.string(),
      }),
    })
  ),
});

export function parseManifest(manifest: string | any): Manifest {
  if (typeof manifest === "string") {
    return manifestSchema.parse(JSON.parse(manifest));
  }

  return manifestSchema.parse(manifest);
}

export function getStructuredManifest(manifest: Manifest) {
  const logConfigsByTxConfig = new Map<number, number[]>();
  for (const logConfig of manifest.log_configs) {
    for (const txConfig of logConfig.tx_configs) {
      if (!logConfigsByTxConfig.has(txConfig)) {
        logConfigsByTxConfig.set(txConfig, []);
      }

      logConfigsByTxConfig.set(
        txConfig,
        logConfigsByTxConfig
          .get(txConfig)!
          .concat(manifest.log_configs.indexOf(logConfig))
      );
    }
  }

  return {
    chains: manifest.chains,
    txConfigs: manifest.tx_configs.map((txConfig, idx) => ({
      name: txConfig.name,
      startBlock: txConfig.start_block,
      chains: txConfig.chains,
      logConfigs: logConfigsByTxConfig
        .get(idx)!
        .map((logConfigIdx) => manifest.log_configs[logConfigIdx]!),
    })),
  };
}

export function getAddress(
  chainId: number,
  logConfig: Manifest["log_configs"][number]
): string | undefined {
  if (typeof logConfig.address === "string") {
    return logConfig.address;
  }

  return logConfig.address[chainId];
}

export function getStartBlock(
  chainId: number,
  txConfig: Manifest["tx_configs"][number]
) {
  return txConfig.start_block[chainId.toString()] ?? 0;
}

export function getLogConfigsForTxConfig(
  manifest: Manifest,
  txConfigIdx: number
) {
  return manifest.log_configs.filter((logConfig) =>
    logConfig.tx_configs.includes(txConfigIdx)
  );
}

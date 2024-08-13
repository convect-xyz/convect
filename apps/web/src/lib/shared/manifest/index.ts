import { z } from "zod";

export type Manifest = z.infer<typeof manifestSchema>;

export const manifestSchema = z.object({
  chains: z.array(
    z.object({
      chainId: z.number(),
      name: z.string(),
    }),
  ),
  tx_configs: z.array(
    z.object({
      start_block: z.coerce.number(),
    }),
  ),
  log_configs: z.array(
    z.object({
      address: z.string().or(z.record(z.number(), z.string())),
      topics: z.array(z.string()),
      tx_configs: z.array(z.number()),
    }),
  ),
});

export function parseManifest(manifest: string | any): Manifest {
  console.log(manifest);

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
          .concat(manifest.log_configs.indexOf(logConfig)),
      );
    }
  }

  return {
    chains: manifest.chains,
    txConfigs: manifest.tx_configs.map((txConfig, idx) => ({
      startBlock: txConfig.start_block,
      logConfigs: logConfigsByTxConfig
        .get(idx)!
        .map((logConfigIdx) => manifest.log_configs[logConfigIdx]!),
    })),
  };
}

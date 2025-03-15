import { z } from "zod";

export const ingestBatchSchema = z.object({
  batchId: z.string(),
  chainId: z.number(),
  transactions: z.array(
    z.object({
      transaction: z.any(),
      txConfigs: z.array(z.number()),
    })
  ),
});

export type IngestBatch = z.infer<typeof ingestBatchSchema>;

export type IngestBatchTransaction = IngestBatch["transactions"][number];

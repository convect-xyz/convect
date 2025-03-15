import { z } from "zod";

export const ingestBatchSchema = z.object({
  batchId: z.string(),
  chainId: z.string(),
  transactions: z.array(
    z.object({
      transactionHash: z.string(),
      blockNumber: z.number(),
      value: z.number(),
    })
  ),
});

export type IngestBatch = z.infer<typeof ingestBatchSchema>;

export type IngestTransaction = IngestBatch["transactions"][number];

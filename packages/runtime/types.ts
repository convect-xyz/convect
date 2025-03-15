import { z } from "zod";

export const ingestBatchSchema = z.object({
  batchId: z.string(),
  chainId: z.number(),
  transactions: z.array(
    z.object({
      transactionHash: z.string(),
      blockNumber: z.number(),
      value: z.string(),
    })
  ),
});

export type IngestBatch = z.infer<typeof ingestBatchSchema>;

export type IngestTransaction = IngestBatch["transactions"][number];

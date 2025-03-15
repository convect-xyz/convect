import { z } from "zod";

export const ingestBatchSchema = z.object({
  batchId: z.string(),
  chainId: z.number(),
  transactions: z.array(z.any()),
});

export type IngestBatch = z.infer<typeof ingestBatchSchema>;

export type IngestTransaction = IngestBatch["transactions"][number];

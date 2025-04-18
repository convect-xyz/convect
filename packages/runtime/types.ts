import { z } from "zod";

export const ingestBatchSchema = z.object({
  batchId: z.string(),
  chainId: z.number(),
  transactions: z.array(
    z.object({
      transaction: z.custom<{
        blockNumber: number;
        blockHash: string;
        transactionIndex: number;
        transactionHash: string;
        from: string;
        to: string;
        value: bigint;
        logs: Array<{
          address: string;
          topics: Array<string>;
          data: string;
          logIndex: number;
          removed: boolean;
        }>;
      }>(),
      txConfigs: z.array(z.number()),
    })
  ),
});

export type IngestBatch = z.infer<typeof ingestBatchSchema>;

export type IngestBatchTransaction = IngestBatch["transactions"][number];

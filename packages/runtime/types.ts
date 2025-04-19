import { z } from "zod";

export const ingestBatchSchema = z.object({
  batchId: z.string(),
  chainId: z.number(),
  transactions: z.array(
    z.object({
      transaction: z
        .custom<{
          blockNumber: number;
          blockHash: string;
          transactionIndex: number;
          transactionHash: string;
          from: string;
          to: string;
          value: string;
          logs: Array<{
            address: string;
            topics: Array<string>;
            data: string;
            logIndex: number;
            removed: boolean;
          }>;
        }>()
        .transform((tx) => ({
          ...tx,
          value: !tx.value.startsWith("0x") ? "0x" + tx.value : tx.value,
        })),
      txConfigs: z.array(z.number()),
    })
  ),
});

export type IngestBatch = z.infer<typeof ingestBatchSchema>;

export type IngestBatchTransaction = IngestBatch["transactions"][number];

import { AbiEvent } from "abitype";
import { Log as ViemLog } from "viem";
import { Log } from "./log";
import { Transaction } from "./transaction";

export type InferTransaction<TTransaction, TLabel = string> =
  TTransaction extends Transaction<infer TLogs>
    ? {
        label: TLabel;
        logs: TLogs extends Record<string, any>
          ? {
              [K in keyof TLogs]: TLogs[K] extends Log<infer TEvent, any>
                ? TEvent extends AbiEvent
                  ? ViemLog<bigint, number, false, TEvent, true>[]
                  : never
                : never;
            }
          : never;
      }
    : never;

type InferTransactions<TTransactions> =
  TTransactions extends Record<string, any>
    ? {
        [K in keyof TTransactions]: InferTransaction<TTransactions[K], K>;
      }[keyof TTransactions]
    : never;

export function ingest<
  TTransactions,
  TCreateReturn extends Record<string, string | number | boolean>,
>(options: {
  transactions: TTransactions;
  handler: (transactions: InferTransactions<TTransactions>[]) => Promise<void>;
  onCreate?: () => Promise<TCreateReturn>;
  onReset?: (params: TCreateReturn) => Promise<void>;
  onDelete?: (params: TCreateReturn) => Promise<void>;
}) {
  return {
    ...options,
  };
}

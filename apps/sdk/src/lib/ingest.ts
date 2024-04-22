import { AbiEvent } from "abitype";
import { Log as ViemLog } from "viem";
import { Chain } from "./chain";
import { Log } from "./log";
import { Transaction } from "./transaction";

export type InferTransaction<TTransaction> =
  TTransaction extends Transaction<infer TLogs>
    ? TLogs extends Record<string, Log<infer TEvent, any>>
      ? TEvent extends AbiEvent
        ? ViemLog<bigint, number, false, TEvent, true>
        : never
      : never
    : never;

type InferTransactions<TTransactions> =
  TTransactions extends Record<string, any>
    ? {
        [K in keyof TTransactions]: TTransactions[K] extends Transaction<
          infer TLogs
        >
          ? TLogs extends Record<string, Log<infer TEvent, any>>
            ? TEvent extends AbiEvent
              ? { label: K } & ViemLog<bigint, number, false, TEvent, true>
              : never
            : never
          : never;
      }[keyof TTransactions]
    : never;

// [K in keyof TLogs]: TLogs[K] extends Log<infer TEvent, any>
// ? TEvent extends AbiEvent
//   ? (ViemLog<bigint, number, false, TEvent, true> & {})[]
//   : never
// : never;

export function ingest<TTransactions>(options: {
  chain: Chain;
  transactions: TTransactions;
  handler: (transactions: InferTransactions<TTransactions>[]) => Promise<void>;
}) {
  return {
    ...options,
  };
}

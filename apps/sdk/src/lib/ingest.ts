import { Chain } from "./chain";
import { Log } from "./log";
import { Transaction } from "./transaction";

type InferTransactions<
  TLogs extends Record<string, Log<any, any>>,
  TTransactions extends Record<string, Transaction<TLogs>>,
> = {
  [K in keyof TTransactions]: { type: K } & TTransactions[K];
}[keyof TTransactions];
// [K in keyof TLogs]: TLogs[K] extends Log<infer TEvent, any>
// ? TEvent extends AbiEvent
//   ? (ViemLog<bigint, number, false, TEvent, true> & {})[]
//   : never
// : never;

export function ingest<
  TLogs extends Record<string, Log<any, any>>,
  TTransactions extends Record<string, Transaction<TLogs>>,
>(options: {
  chain: Chain;
  transactions: TTransactions;
  handler: (
    transactions: InferTransactions<TLogs, TTransactions>
  ) => Promise<void>;
}) {
  return {
    ...options,
  };
}

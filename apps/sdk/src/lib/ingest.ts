import { AbiEvent } from "abitype";
import { Log as ViemLog } from "viem";
import { Log } from "./log";
import { Transaction } from "./transaction";

type InferLogs<TLogs extends Record<string, Log<any, any>>> = {
  [K in keyof TLogs]: TLogs[K] extends Log<infer TEvent, any>
    ? TEvent extends AbiEvent
      ? ViemLog<bigint, number, false, TEvent, true>[]
      : never
    : never;
};

export function ingest<TLogs extends Record<string, Log<any, any>>>(options: {
  transaction: Transaction<TLogs>;
  handler: (logs: InferLogs<TLogs>[]) => Promise<void>;
}) {
  return {
    ...options,
    abi: Object.values((options.transaction as any)._logs).map(
      (log: any) => log._event
    ),
  };
}

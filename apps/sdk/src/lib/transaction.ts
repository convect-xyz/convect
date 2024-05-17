import { Address, Log as ViemLog } from "viem";

import { AbiEvent } from "abitype";
import { Log } from "./log";

type InferLogs<TLogs> = TLogs extends [Log<infer U>, ...infer Rest]
  ? U extends AbiEvent
    ? ViemLog<bigint, number, false, U, true> | InferLogs<Rest>
    : never
  : never;

export type InferTransaction<TLogs> = {
  from: Address;
  to: Address;
  logs: InferLogs<TLogs>[];
};

export class Transaction<
  const TLogs extends Array<any>,
  TIndependent extends boolean,
  THandler,
> {
  private _logs: TLogs;
  private _independent: TIndependent;
  private _handler: THandler;
  private _logMap: Map<string, any>;

  constructor(options: {
    logs: TLogs;
    independent: TIndependent;
    handler: THandler;
  }) {
    this._logs = options.logs;
    this._independent = options.independent;
    this._handler = options.handler;
    this._logMap = this._logs.reduce((acc, curr) => {
      acc.set(curr._topics.at(0), curr);
      return acc;
    }, new Map<string, any>());
  }
}

export function transaction<
  const TLogs extends Array<any>,
  TIndependent extends boolean,
  THandler = (
    v: TIndependent extends true
      ? InferTransaction<TLogs>
      : Array<InferTransaction<TLogs>>
  ) => Promise<void>,
>(v: { logs: TLogs; independent: TIndependent; handler: THandler }) {
  return new Transaction<TLogs, TIndependent, THandler>(v);
}

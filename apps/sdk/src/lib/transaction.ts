import { Address, Log as ViemLog } from "viem";

import { Log } from "./log";

export type InferTransaction<TLogs> = {
  from: Address;
  to: Address;
  logs: TLogs extends Array<Log<infer TEvents>>
    ? ViemLog<bigint, number, false, TEvents, true>[]
    : never;
};

export class Transaction<
  TLogs extends Array<any>,
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
  TLogs extends Array<any>,
  TIndependent extends boolean,
  THandler = (
    v: TIndependent extends true
      ? InferTransaction<TLogs>
      : Array<InferTransaction<TLogs>>
  ) => Promise<void>,
>(v: { logs: TLogs; independent: TIndependent; handler: THandler }) {
  return new Transaction<TLogs, TIndependent, THandler>(v);
}

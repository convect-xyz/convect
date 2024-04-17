import { Log } from "./log";

export class Transaction<TLogs extends Record<string, Log<any, any>>> {
  private _logs: TLogs;

  constructor(options: { logs: TLogs }) {
    this._logs = options.logs;
  }
}

export function transaction<TLogs extends Record<string, Log<any, any>>>(
  logs: TLogs
) {
  return new Transaction<TLogs>({
    logs,
  });
}

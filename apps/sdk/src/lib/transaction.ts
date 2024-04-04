import { Log } from "./log";

export class Transaction<TLogs extends Record<string, Log<any, any>>> {
  #options: { logs: TLogs };

  constructor(options: { logs: TLogs }) {
    this.#options = options;
  }
}

export function transaction<TLogs extends Record<string, Log<any, any>>>(
  logs: TLogs
) {
  return new Transaction<TLogs>({
    logs,
  });
}

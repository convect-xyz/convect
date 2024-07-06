type Log = {};
type Handler = {};

export interface Ps {
  /**
   * {@link https://github.com/microsoft/tsdoc}
   */
  logs: Array<Log>;
  handler: Handler;
  startBlock?: bigint;
}

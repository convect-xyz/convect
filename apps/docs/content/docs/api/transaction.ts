type Log = {};
type Handler = {};
type Chain = {};

export interface Ps {
  chains: Array<Chain>;
  logs: Array<Log>;
  handler: Handler;
}

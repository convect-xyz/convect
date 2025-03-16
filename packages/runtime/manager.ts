import { handlerServerAxios } from "./axios";

type ProcessedBatchResult = {
  batchId: string;
  messageId: string;
  timestampMs: number;
  transactions: Array<{
    transactionHash: string;
    handler: string;
  }>;
} & ({ status: "SUCCESS" } | { status: "FAILED"; error: object });

export class ResultsManager {
  // A map of batchId to ProcessedBatchResult
  private results: Map<string, ProcessedBatchResult>;
  private invocationId: string;

  constructor(opts: { invocationId: string }) {
    this.results = new Map();
    this.invocationId = opts.invocationId;
  }

  get failure() {
    for (const result of this.results.values()) {
      if (result.status === "FAILED") {
        return result;
      }
    }
  }

  private _addWithStatus(
    opts: {
      batchId: string;
      messageId: string;
      transactions: ProcessedBatchResult["transactions"];
    } & ({ status: "SUCCESS" } | { status: "FAILED"; error: any })
  ) {
    const { batchId } = opts;
    if (!this.results.has(batchId)) {
      this.results.set(batchId, {
        ...opts,
        timestampMs: Date.now(),
        transactions: [],
      });
    }

    const result = this.results.get(batchId)!;
    result.status = opts.status;
    result.transactions.push(
      ...opts.transactions.map((tx) => ({
        ...tx,
        status: opts.status,
      }))
    );
  }

  addSuccess(opts: {
    batchId: string;
    messageId: string;
    transactions: ProcessedBatchResult["transactions"];
  }) {
    this._addWithStatus({
      ...opts,
      status: "SUCCESS",
    });
  }

  fail(opts: {
    batchId: string;
    messageId: string;
    error: any;
    transactions: ProcessedBatchResult["transactions"];
  }) {
    this._addWithStatus({
      ...opts,
      error: opts.error,
      status: "FAILED",
    });

    throw opts.error;
  }

  async uploadResults() {
    await handlerServerAxios.post("/results", {
      invocationId: this.invocationId,
      results: Array.from(this.results.values()),
    });
  }
}

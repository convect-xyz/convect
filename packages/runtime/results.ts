import { handlerServerAxios } from "./axios";

type ProcessedBatchResult = {
  batchId: string;
  messageId: string;
  receiptHandle: string;
  timestampMs: number;
  transactions: Array<{
    transactionHash: string;
    handler: string;
  }>;
} & {
  status:
    | { label: "SUCCESS" }
    | { label: "FAILED"; message: string; stacktrace: string };
};

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
      if (result.status.label === "FAILED") {
        return result;
      }
    }
  }

  private _addWithStatus(
    opts: {
      batchId: string;
      messageId: string;
      receiptHandle: string;
      transactions: ProcessedBatchResult["transactions"];
    } & ({ status: "SUCCESS" } | { status: "FAILED"; error: any })
  ) {
    const { batchId } = opts;
    if (!this.results.has(batchId)) {
      this.results.set(batchId, {
        ...opts,
        status:
          opts.status === "SUCCESS"
            ? { label: "SUCCESS" }
            : {
                label: "FAILED",
                message: opts.error.message ?? "",
                stacktrace: opts.error.stack ?? "",
              },
        timestampMs: Date.now(),
        transactions: [],
      });
    }

    const result = this.results.get(batchId)!;
    result.status =
      opts.status === "SUCCESS"
        ? { label: "SUCCESS" }
        : {
            label: "FAILED",
            message: opts.error.message ?? "",
            stacktrace: opts.error.stack ?? "",
          };

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
    receiptHandle: string;
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
    receiptHandle: string;
    error: any;
    transactions: ProcessedBatchResult["transactions"];
  }) {
    this._addWithStatus({
      ...opts,
      error: opts.error,
      status: "FAILED",
    });

    console.error(opts.error);
    throw opts.error;
  }

  async uploadResults() {
    await handlerServerAxios.post("/results", {
      invocationId: this.invocationId,
      results: Array.from(this.results.values()),
    });
  }
}

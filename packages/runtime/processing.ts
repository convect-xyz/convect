import { IngestBatch } from "./types";

export class BatchQueue
  implements Iterable<IngestBatch & { messageId: string }>
{
  private batches: Array<
    IngestBatch & { messageId: string; receiptHandle: string }
  >;
  private startIdx: number;
  private constructor(
    batches: Array<IngestBatch & { messageId: string; receiptHandle: string }>,
    startIdx: number
  ) {
    this.batches = batches;
    this.startIdx = startIdx;
  }

  [Symbol.iterator](): Iterator<
    IngestBatch & { messageId: string; receiptHandle: string }
  > {
    return new BatchIterator(this.batches, this.startIdx);
  }

  static async fromBatches(
    batches: Array<IngestBatch & { messageId: string; receiptHandle: string }>
  ) {
    return new BatchQueue(batches, 0);
  }
}

class BatchIterator
  implements
    Iterator<IngestBatch & { messageId: string; receiptHandle: string }>
{
  private batches: Array<
    IngestBatch & { messageId: string; receiptHandle: string }
  >;
  private startIdx: number;

  constructor(
    batches: Array<IngestBatch & { messageId: string; receiptHandle: string }>,
    startIdx: number
  ) {
    this.batches = batches;
    this.startIdx = startIdx;
  }

  next(): IteratorResult<
    IngestBatch & { messageId: string; receiptHandle: string }
  > {
    if (this.startIdx >= this.batches.length) {
      return { done: true, value: undefined };
    }

    const batch = this.batches[this.startIdx]!;
    this.startIdx += 1;
    return { done: false, value: batch };
  }
}

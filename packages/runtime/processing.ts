import { handlerServerAxios } from "./axios";
import { IngestBatch } from "./types";

async function getFailureId() {
  const pipeline = await handlerServerAxios
    .get("/pipeline")
    .then((r) => r.data);

  return pipeline.errorBatchId;
}

export class BatchQueue
  implements Iterable<IngestBatch & { messageId: string }>
{
  private batches: Array<IngestBatch & { messageId: string }>;
  private startIdx: number;
  private constructor(
    batches: Array<IngestBatch & { messageId: string }>,
    startIdx: number
  ) {
    this.batches = batches;
    this.startIdx = startIdx;
  }

  [Symbol.iterator](): Iterator<IngestBatch & { messageId: string }> {
    return new BatchIterator(this.batches, this.startIdx);
  }

  static async fromBatches(
    batches: Array<IngestBatch & { messageId: string }>
  ) {
    const failureId = await getFailureId();
    const startIdx = failureId
      ? batches.findIndex((b) => b.batchId === failureId)
      : 0;

    return new BatchQueue(batches, startIdx);
  }
}

class BatchIterator implements Iterator<IngestBatch & { messageId: string }> {
  private batches: Array<IngestBatch & { messageId: string }>;
  private startIdx: number;

  constructor(
    batches: Array<IngestBatch & { messageId: string }>,
    startIdx: number
  ) {
    this.batches = batches;
    this.startIdx = startIdx;
  }

  next(): IteratorResult<IngestBatch & { messageId: string }> {
    if (this.startIdx >= this.batches.length) {
      return { done: true, value: undefined };
    }

    const batch = this.batches[this.startIdx]!;
    this.startIdx += 1;
    return { done: false, value: batch };
  }
}

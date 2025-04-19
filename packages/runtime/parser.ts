import { SQSEvent } from "aws-lambda";
import axios from "axios";
import axiosRetry from "axios-retry";
import { z } from "zod";
import { IngestBatch, ingestBatchSchema } from "./types";

axiosRetry(axios, {
  retries: 3,
  retryDelay: (retryCount) => {
    return retryCount * 1000;
  },
});

const eventBodySchema = z
  .object({
    type: z.literal("S3"),
    downloadUrl: z.string(),
  })
  .or(z.object({ type: z.literal("Raw"), data: ingestBatchSchema }));

type EventBody = z.infer<typeof eventBodySchema>;

type ParsedRecord = {
  messageId: string;
  receiptHandle: string;
  body: EventBody;
};

export function parseSqsEvent(event: SQSEvent) {
  const records = event.Records.map((record) => {
    return {
      messageId: record.messageId,
      receiptHandle: record.receiptHandle,
      body: eventBodySchema.parse(JSON.parse(record.body)),
    };
  });

  const batches = parseBatches(records);

  return batches;
}

async function parseBatches(records: Array<ParsedRecord>) {
  const batches: Array<
    IngestBatch & { messageId: string; receiptHandle: string }
  > = [];
  const s3Results = await getS3Results(records);
  for (const record of records) {
    const batchData =
      record.body.type === "Raw"
        ? record.body.data
        : s3Results.get(record.messageId)!;

    batches.push({
      ...batchData,
      messageId: record.messageId,
      receiptHandle: record.receiptHandle,
    });
  }
  return batches;
}

async function getS3Results(records: Array<ParsedRecord>) {
  const s3Results = new Map<string, IngestBatch>();
  const promises: Array<Promise<void>> = [];
  for (const record of records) {
    if (record.body.type === "S3") {
      promises.push(
        axios.get(record.body.downloadUrl).then(async (response) => {
          s3Results.set(
            record.messageId,
            ingestBatchSchema.parse(response.data)
          );
        })
      );
    }
  }

  await Promise.all(promises);
  return s3Results;
}

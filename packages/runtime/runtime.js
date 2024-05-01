import { S3 } from "@aws-sdk/client-s3";
import { v4 } from "uuid";
import { decodeEventLog } from "viem";
import pipeline from "./pipeline";

const commonFields = new Set([
  "transactionHash",
  "blockHash",
  "transactionIndex",
  "blockNumber",
]);

const s3 = new S3({ region: "eu-west-1" });

export async function handler(event, context) {
  const parsedTxs = [];

  const records = event.Records.map((record) => ({
    id: v4(),
    data: JSON.parse(record.body),
  }));

  const s3Results = new Map();
  await Promise.all(
    records
      .filter((r) => r.data.type === "batch")
      .map((r) =>
        s3
          .getObject({
            Bucket: r.data.data.bucket,
            Key: r.data.data.prefix,
          })
          .then(async (obj) => {
            s3Results.set(r.id, JSON.parse(await obj.Body.transformToString()));
          })
      )
  );

  for (const record of records) {
    const payload = record.data;
    var txs = [];
    if (payload.type === "non-batch") {
      txs = payload.data;
    } else {
      txs = s3Results.get(record.id);
    }

    for (const tx of txs) {
      const txConfig = pipeline.transactions[tx.label];
      for (const [name, logs] of Object.entries(tx.logs)) {
        const logConfig = txConfig._logs[name];

        for (var i = 0; i < logs.length; i++) {
          const log = logs[i];

          const decodedEvent = decodeEventLog({
            abi: [logConfig._event],
            data: log.data,
            topics: log.topics,
          });

          log.eventName = decodedEvent.eventName;
          log.args = decodedEvent.args;

          logs[i] = new Proxy(log, {
            get(target, p, receiver) {
              if (commonFields.has(p)) {
                return tx[p];
              }

              return target[p];
            },
          });
        }
      }

      parsedTxs.push(tx);
    }
  }

  await pipeline.handler(parsedTxs);

  return {};
}

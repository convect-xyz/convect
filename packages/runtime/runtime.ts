import { Context, SQSEvent } from "aws-lambda";
import { decodeEventLog } from "viem";
import { parseSqsEvent } from "./parser";
import { BatchQueue } from "./processing";
import { ResultsManager } from "./results";
import { IngestBatch, IngestBatchTransaction } from "./types";

class MyConsole extends console.Console {
  constructor(stdout: NodeJS.WriteStream, stderr: NodeJS.WriteStream) {
    super(stdout, stderr);
  }

  system(message?: any, ...optionalParams: any[]): void {
    super.debug(message, ...optionalParams);
  }
}

const systemConsole = new MyConsole(process.stdout, process.stderr);

const USER_ENVS = (
  JSON.parse(process.env.USER_ENVS!) as Array<{
    key: string;
    value: string;
  }>
).reduce(
  (acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  },
  {} as Record<string, string>
);

const CHAIN_ID = process.env.CHAIN_ID;
const DEPLOYMENT_ID = process.env.DEPLOYMENT_ID;

for (const env of Object.keys(process.env)) {
  delete process.env[env];
}

for (const [name, value] of Object.entries(USER_ENVS)) {
  process.env[name] = value;
}

const { default: pipeline } = require("./pipeline");

export async function handler(event: SQSEvent, context: Context) {
  const batches = await parseSqsEvent(event);
  const resultsManager = new ResultsManager({
    invocationId: context.awsRequestId,
  });

  for (const batch of await BatchQueue.fromBatches(batches)) {
    await processBatch(resultsManager, batch).catch(() => {});
  }

  await resultsManager.uploadResults();

  const failure = resultsManager.failure;
  if (failure) {
    const failureIdx = batches.findIndex((b) => b.batchId === failure.batchId);
    const batchesToRetry = batches.slice(failureIdx);

    return {
      batchItemFailures: batchesToRetry.map((batch) => ({
        itemIdentifier: batch.messageId,
      })),
    };
  }

  return {};
}

async function processBatch(
  resultsManager: ResultsManager,
  batch: IngestBatch & { messageId: string; receiptHandle: string }
) {
  const groupedTxs = groupTransactions(batch.transactions, pipeline.handlers);
  for (let i = 0; i < groupedTxs.length; i++) {
    let txConfig = pipeline.handlers[i];
    const txs = groupedTxs[i]!.map((tx) => decodeTx(tx.transaction, txConfig));
    if (txs.length === 0) {
      continue;
    }

    try {
      await txConfig._handler(txs, getContext());
      resultsManager.addSuccess({
        batchId: batch.batchId,
        messageId: batch.messageId,
        receiptHandle: batch.receiptHandle,
        transactions: txs.map((tx) => ({
          transactionHash: tx.transactionHash,
          handler: i.toString(),
        })),
      });
    } catch (e) {
      resultsManager.fail({
        batchId: batch.batchId,
        messageId: batch.messageId,
        receiptHandle: batch.receiptHandle,
        error: e,
        transactions: txs.map((tx) => ({
          transactionHash: tx.transactionHash,
          handler: i.toString(),
        })),
      });
    }
  }
}

function getContext() {
  return {
    chainId: Number(CHAIN_ID),
    deploymentId: DEPLOYMENT_ID,
  };
}

export function groupTransactions(
  transactions: IngestBatchTransaction[],
  allTxConfigs: Array<any>
) {
  const groupedTxs: Array<Array<IngestBatchTransaction>> = [
    ...allTxConfigs.map((_) => []),
  ];

  for (let txIdx = 0; txIdx < transactions.length; txIdx++) {
    const transaction = transactions[txIdx]!;
    for (const txConfigIdx of transaction.txConfigs) {
      groupedTxs[txConfigIdx]!.push(transaction);
    }
  }

  return groupedTxs;
}

export function decodeTx(tx: any, txConfig: any) {
  const newTx = { ...tx, logs: [] };

  for (const log of tx.logs) {
    var topic = log.topics.at(0);
    const logConfig = txConfig._logMap.get(topic);

    if (!logConfig) {
      continue;
    }

    try {
      const decodedEvent: any = decodeEventLog({
        abi: [logConfig._event],
        data: log.data,
        topics: log.topics,
      });

      log.eventName = decodedEvent.eventName;
      log.args = decodedEvent.args;
      log.transactionHash = tx.transactionHash;
      log.transactionIndex = tx.transactionIndex;

      newTx.logs.push({
        ...log,
        eventName: decodedEvent.eventName,
        args: decodedEvent.args,
      });
    } catch (e) {
      systemConsole.system(
        "Error decoding log",
        tx.transactionHash,
        tx.transactionIndex,
        e
      );
    }
  }

  return newTx;
}

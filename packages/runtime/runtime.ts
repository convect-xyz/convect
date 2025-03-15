import { Context, SQSEvent } from "aws-lambda";
import { Address, Hex, decodeEventLog, isAddressEqual } from "viem";
import { ResultsManager } from "./manager";
import { parseSqsEvent } from "./parser";
import { BatchQueue } from "./processing";
import { IngestBatch, IngestTransaction } from "./types";

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

type LogIdentifier = {
  signature: Address;
  address: Hex;
};

type EligibleTxConfig = {
  label: string;
  config: any;
};

export async function handler(event: SQSEvent, context: Context) {
  const batches = await parseSqsEvent(event);
  const resultsManager = new ResultsManager({
    invocationId: context.awsRequestId,
  });

  for (const batch of await BatchQueue.fromBatches(batches)) {
    try {
      await processBatch(resultsManager, batch);
    } catch (e) {
      console.error(e);
      break;
    }
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
  batch: IngestBatch & { messageId: string }
) {
  const groupedTxs = groupTransactions(batch.transactions, pipeline.handlers);
  for (let i = 0; i < groupedTxs.length; i++) {
    let txConfig = pipeline.handlers[i];
    const txs = groupedTxs[i]!.map((tx) => decodeTx(tx, txConfig));
    if (txs.length === 0) {
      continue;
    }

    try {
      await txConfig._handler(txs, getContext());
      resultsManager.addSuccess({
        batchId: batch.batchId,
        messageId: batch.messageId,
        transactions: txs.map((tx) => ({
          transactionHash: tx.transactionHash,
          handler: i.toString(),
        })),
      });
    } catch (e) {
      resultsManager.fail({
        batchId: batch.batchId,
        messageId: batch.messageId,
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
  transactions: IngestTransaction[],
  allTxConfigs: Array<any>
) {
  const groupedTxs: Array<Array<IngestTransaction>> = [
    ...allTxConfigs.map((_) => []),
  ];

  for (let txIdx = 0; txIdx < transactions.length; txIdx++) {
    const transaction = transactions[txIdx]!;
    const txLogIdentifiers = getUniqueLogIdentifiers(transaction);

    for (var txCfgIdx = 0; txCfgIdx < allTxConfigs.length; txCfgIdx++) {
      const txConfig = allTxConfigs[txCfgIdx];

      const isInChain = () =>
        !txConfig._chains ||
        txConfig._chains.map((c: any) => c.chainId).includes(Number(CHAIN_ID));

      const canProcessTx = txConfig._logs.every((logConfig: any) =>
        txLogIdentifiers.some(
          (log) => logConfigMatches(logConfig, log) && isInChain()
        )
      );

      if (canProcessTx) {
        groupedTxs[txCfgIdx]!.push(transaction);
      }
    }
  }

  return groupedTxs;
}

// Eligible Tx configs are configs that match the given transaction
export function getEligibleTxConfigs(
  tx: any,
  allTxConfigs: Array<any>
): Array<EligibleTxConfig> {
  const eligibleTxConfigs = [];
  const txLogIdentifiers = getUniqueLogIdentifiers(tx);

  for (const [label, config] of allTxConfigs) {
    var isEligible = true;

    for (const logConfig of config._logs) {
      const hasMatchingLog = txLogIdentifiers.some((log) =>
        logConfigMatches(logConfig, log)
      );
      if (!hasMatchingLog) {
        isEligible = false;
        break;
      }
    }

    if (isEligible) {
      eligibleTxConfigs.push({ label, config });
    }
  }

  return eligibleTxConfigs.sort(txConfigComparison(tx));
}

export function txConfigComparison(tx: any) {
  const identifiers = getUniqueLogIdentifiers(tx);
  return (txConfigA: any, txConfigB: any) => {
    for (const identifier of identifiers) {
      if (
        txConfigA.config._logMap.get(identifier.signature) &&
        txConfigB.config._logMap.get(identifier.signature)
      ) {
        continue;
      }

      if (txConfigA.config._logMap.get(identifier.signature)) return -1;

      if (txConfigB.config._logMap.get(identifier.signature)) return 1;
    }

    return 0;
  };
}

export function getUniqueLogIdentifiers(tx: any): Array<LogIdentifier> {
  const seen = new Set();
  const unique = [];

  for (const log of tx.logs) {
    const identifier = log.topics.at(0) + log.address;
    if (!seen.has(identifier)) {
      unique.push(getLogIdentifier(log));
      seen.add(identifier);
    }
  }

  return unique;
}

export function getLogIdentifier(txLog: any): LogIdentifier {
  return {
    signature: txLog.topics.at(0),
    address: txLog.address,
  };
}

export function decodeTx(tx: any, txConfig: any) {
  const newTx = { ...tx, logs: [] };

  for (const log of tx.logs) {
    var topic = log.topics.at(0);
    const logConfig = txConfig._logMap.get(topic);

    if (!logConfig) continue;

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
  }

  return newTx;
}

export function logConfigMatches(logConfig: any, logIdentifier: LogIdentifier) {
  return (
    (isAddressEqual(getOrigin(logConfig), logIdentifier.address) &&
      logConfig._topics.at(0) === logIdentifier.signature) ||
    (!logConfig.address && logConfig._topics.at(0) === logIdentifier.signature)
  );
}

export function getOrigin(logConfig: any) {
  if (typeof logConfig._origin === "string") {
    return logConfig._origin;
  }

  return logConfig._origin[getContext().chainId];
}

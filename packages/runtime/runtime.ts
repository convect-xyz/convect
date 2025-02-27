import { Context, SQSEvent } from "aws-lambda";
import axios from "axios";
import axiosRetry from "axios-retry";
import { Address, Hex, decodeEventLog, isAddressEqual } from "viem";

axiosRetry(axios, {
  retries: 3,
  retryDelay: (retryCount) => {
    return retryCount * 1000;
  },
});

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

type ParsedRecord = {
  id: string;
  data: Record<string, any>;
};

type LogIdentifier = {
  signature: Address;
  address: Hex;
};

type EligibleTxConfig = {
  label: string;
  config: any;
};

type TransactionResultLabel = {
  label: String;
  timestamp_ms: number;
};
type TransactionResult = {
  transaction_hash: string;
  batch_id: string;
  successful_labels: Array<TransactionResultLabel>;
  failed_label: TransactionResultLabel | undefined;
};

type Transaction = {
  transactionHash: string;
  blockNumber: number;
};

export async function handler(event: SQSEvent, context: Context) {
  const parsedRecords: Array<ParsedRecord> = event.Records.map((record) => ({
    id: record.messageId,
    isRetry: Number(record.attributes.ApproximateReceiveCount) > 1,
    data: JSON.parse(record.body),
  }));

  const isRetry = event.Records.some(
    (r) => Number(r.messageAttributes.ApproximateReceiveCount) > 1
  );

  const parsedTxs = parseTransactions(
    parsedRecords,
    await getS3Results(parsedRecords)
  );

  const { results, addFailure, addSuccessful, getFailureCount } =
    createStateManager();

  let err: any;

  const groupedTxs = groupTransactions(parsedTxs, pipeline.handlers);
  for (
    let i = isRetry ? await getFailureIdx() : 0;
    i < groupedTxs.length;
    i++
  ) {
    let txConfig = pipeline.handlers[i];
    const batch = groupedTxs[i]!.map((tx) => decodeTx(tx, txConfig));

    if (batch.length === 0) {
      continue;
    }

    try {
      await txConfig._handler(batch, getContext());
      batch.map((tx) =>
        addSuccessful(tx.transactionHash, tx.batchId, i.toString())
      );
    } catch (e) {
      addFailure(
        batch.at(0).transactionHash,
        batch.at(0).batchId,
        i.toString()
      );
      err = e;
      break;
    }
  }

  await uploadResults(
    context.awsRequestId,
    results,
    event.Records.map((r) => r.receiptHandle)
  );

  if (getFailureCount() > 0) {
    throw err;
  }

  return {};
}

function getContext() {
  return {
    chainId: Number(CHAIN_ID),
    deploymentId: DEPLOYMENT_ID,
  };
}

export function parseTransactions(
  parsedRecords: Array<ParsedRecord>,
  s3Results: Map<any, any>
) {
  const transactions: Array<Transaction> = [];
  for (const record of parsedRecords) {
    const payload = record.data;
    if (payload.type === "Raw") {
      transactions.push(...payload.data);
    } else {
      transactions.push(...s3Results.get(record.id));
    }
  }
  return transactions;
}

export async function getFailureIdx() {
  const pipeline = await axios
    .get("http://127.0.0.1:4121/pipeline")
    .then((r) => r.data);

  return Number(pipeline.ErrorLabel_);
}

export function findErrorTxIdx(parsedTxs: Array<Transaction>, pipeline: any) {
  const index = parsedTxs.findIndex(
    (v) => pipeline.ErrorTx_ === v.transactionHash
  );
  if (index === -1) throw new Error("Index for failed tx not found");

  return index;
}

export async function uploadResults(
  invocation_id: string,
  results: Array<TransactionResult>,
  message_ids: Array<string>
) {
  await axios.post("http://127.0.0.1:4121/results", {
    invocation_id,
    results,
    message_ids,
  });
}

export async function getS3Results(batchRecords: Array<ParsedRecord>) {
  const s3Results = new Map();

  await Promise.all(
    batchRecords
      .filter((r) => r.data.type === "Batch")
      .map((record) =>
        axios.get(record.data.download_url).then(async (response) => {
          s3Results.set(record.id, response.data);
        })
      )
  );

  return s3Results;
}

function createStateManager() {
  const txHashIdx = new Map<string, number>();
  const results: Array<TransactionResult> = [];
  let failureCount = 0;
  let successCount = 0;

  function addSuccessful(txHash: string, batchId: string, handler: string) {
    if (!txHashIdx.has(txHash)) {
      txHashIdx.set(txHash, results.length);
      results.push({
        transaction_hash: txHash,
        successful_labels: [],
        batch_id: batchId,
        failed_label: undefined,
      });
    }

    results[txHashIdx.get(txHash)!]!.successful_labels.push({
      label: handler,
      timestamp_ms: Date.now(),
    });
    successCount++;
  }

  function addFailure(txHash: string, batchId: string, handler: string) {
    if (!txHashIdx.has(txHash)) {
      txHashIdx.set(txHash, results.length);
      results.push({
        transaction_hash: txHash,
        successful_labels: [],
        batch_id: batchId,
        failed_label: undefined,
      });
    }

    results[txHashIdx.get(txHash)!]!.failed_label = {
      label: handler,
      timestamp_ms: Date.now(),
    };
    failureCount++;
  }

  return {
    addSuccessful,
    addFailure,
    results,
    getFailureCount: () => failureCount,
    getSuccessCount: () => successCount,
  };
}

export function groupTransactions(
  transactions: Transaction[],
  allTxConfigs: Array<any>
) {
  const groupedTxs: Array<Array<Transaction>> = [
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
      console.log(e);
      console.log(logConfig._event);
      console.log(tx);
      console.log(txConfig);
      console.log(log);
    }
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

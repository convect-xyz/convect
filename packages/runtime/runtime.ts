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
  messageId: string;
  data: Record<string, any>;
};

type ParsedBatch = {
  batchId: string;
  messageId: string;
  transactions: Array<Transaction>;
};

type LogIdentifier = {
  signature: Address;
  address: Hex;
};

type EligibleTxConfig = {
  label: string;
  config: any;
};

type ProcessedBatchResult = {
  batchId: string;
  messageId: string;
  timestampMs: number;
  status: "SUCCESS" | "FAILURE";
  transactions: Array<{
    transactionHash: string;
    handler: string;
  }>;
};

type Transaction = {
  transactionHash: string;
  blockNumber: number;
  value: number;
};

export async function handler(event: SQSEvent, context: Context) {
  const parsedRecords: Array<ParsedRecord> = event.Records.map((record) => ({
    messageId: record.messageId,
    data: JSON.parse(record.body),
  }));

  const parsedBatches = parseBatches(
    parsedRecords,
    await getS3Results(parsedRecords)
  );

  const { results, failBatch, succeedBatch, getFailureCount } =
    createStateManager();

  let err: any;
  const failureId = await getFailureId();
  const startIdx = failureId
    ? parsedBatches.findIndex((b) => b.batchId === failureId)
    : 0;

  for (var i = startIdx; i < parsedBatches.length; i++) {
    const batch = parsedBatches[i]!;
    const groupedTxs = groupTransactions(batch.transactions, pipeline.handlers);
    for (let i = 0; i < groupedTxs.length; i++) {
      let txConfig = pipeline.handlers[i];
      const txs = groupedTxs[i]!.map((tx) => decodeTx(tx, txConfig));

      if (txs.length === 0) {
        continue;
      }

      try {
        await txConfig._handler(txs, getContext());
        succeedBatch(batch.batchId, {
          messageId: batch.messageId,
          transactions: txs.map((tx) => ({
            transactionHash: tx.transactionHash,
            handler: i.toString(),
          })),
        });
      } catch (e) {
        failBatch(batch.batchId, {
          messageId: batch.messageId,
          transactions: txs.map((tx) => ({
            transactionHash: tx.transactionHash,
            handler: i.toString(),
          })),
        });
        err = e;
        break;
      }
    }
  }

  await uploadResults(
    context.awsRequestId,
    [...results.values()],
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

export function parseBatches(
  parsedRecords: Array<ParsedRecord>,
  s3Results: Map<any, any>
) {
  const batches: Array<ParsedBatch> = [];
  for (const record of parsedRecords) {
    const batch = record.data;
    console.log(batch);
    const txs =
      batch.type === "Raw"
        ? batch.data.transactions
        : s3Results.get(record.messageId)!.transactions;

    batches.push({
      batchId: batch.data.batch_id,
      messageId: record.messageId,
      transactions: txs.map((tx: any) => ({ ...tx, value: Number(tx.value) })),
    });
  }

  return batches;
}

export async function getFailureId() {
  const pipeline = await axios
    .get("http://127.0.0.1:4121/pipeline")
    .then((r) => r.data);

  return pipeline.errorBatchId;
}

export async function uploadResults(
  invocation_id: string,
  results: Array<ProcessedBatchResult>,
  message_ids: Array<string>
) {
  await axios.post("http://127.0.0.1:4121/results", {
    invocation_id,
    results,
  });
}

export async function getS3Results(batchRecords: Array<ParsedRecord>) {
  const s3Results = new Map();

  await Promise.all(
    batchRecords
      .filter((r) => r.data.type === "Batch")
      .map((record) =>
        axios.get(record.data.download_url).then(async (response) => {
          s3Results.set(record.messageId, response.data);
        })
      )
  );

  return s3Results;
}

function createStateManager() {
  const results: Map<string, ProcessedBatchResult> = new Map();
  let failureCount = 0;
  let successCount = 0;

  function addWithStatus(
    batchId: string,
    status: "SUCCESS" | "FAILURE",
    opts: {
      messageId: string;
      transactions: ProcessedBatchResult["transactions"];
    }
  ) {
    if (!results.has(batchId)) {
      results.set(batchId, {
        batchId,
        messageId: opts.messageId,
        timestampMs: Date.now(),
        status,
        transactions: [],
      });
    }

    const result = results.get(batchId)!;
    result.transactions.push(...opts.transactions);
  }

  function succeedBatch(
    batchId: string,
    opts: {
      messageId: string;
      transactions: ProcessedBatchResult["transactions"];
    }
  ) {
    addWithStatus(batchId, "SUCCESS", opts);
    successCount++;
  }

  function failBatch(
    batchId: string,
    opts: {
      messageId: string;
      transactions: ProcessedBatchResult["transactions"];
    }
  ) {
    addWithStatus(batchId, "FAILURE", opts);
    failureCount++;
  }

  return {
    succeedBatch,
    failBatch,
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

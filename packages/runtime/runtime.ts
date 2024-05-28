import axios from "axios";
import { Address, Hex, decodeEventLog, isAddressEqual } from "viem";

import { SQSEvent } from "aws-lambda";

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
)

const HANDLER_ID = process.env.HANDLER_ID;

for(const env of Object.keys(process.env)) {
  delete process.env[env];
}

for(const [name, value] of Object.entries(USER_ENVS)) {
  process.env[name] = value;
}
process.env['HANDLER_ID'] = HANDLER_ID;

const { default: pipeline } = require('./pipeline');
const allTxConfigsWithLabels = [...Object.entries(pipeline)];

type ParsedRecord = {
  id: string;
  data: Record<string, any>
}

type LogIdentifier = {
  signature: Address;
  address: Hex
}

type EligibleTxConfig = {
  label: string;
  config: any
}

type TransactionResult = {
  transaction_hash: string;
  successful_labels: Array<String>;
  failed_label: string | undefined;
};

type Transaction = {
  transactionHash: string
}

export async function handler(event: SQSEvent) {
  const parsedRecords: Array<ParsedRecord> = event.Records.map((record) => ({
    id: record.messageId,
    isRetry: Number(record.attributes.ApproximateReceiveCount) > 1,
    data: JSON.parse(record.body),
  }));

  const isRetry = event.Records.some((r) => Number(r.messageAttributes.ApproximateReceiveCount) > 1)

  const s3Results = await getS3Results(parsedRecords);
  const parsedTxs = parseTransactions(parsedRecords, s3Results);

  const { results, addFailure, addSuccessful, failureCount } = createStateManager();
  var { startTransactionIdx, startProcessor } = await getInitialisation({
    parsedTxs,
    isRetry
  })
  
  const iterator = new TransactionIterator(parsedTxs, startTransactionIdx);

  process_loop:
  while (iterator.hasNext()) {
    const { batch, processors } = getNextTransactionBatch(iterator);
    
    for (const { label, config: txConfig } of processors) {
      if(startProcessor && label !== startProcessor) {
        continue
      }

      try {
        await txConfig._handler(batch.map((tx) => decodeTx(tx, txConfig)));
        batch.map((tx) => addSuccessful(tx.transactionHash, label))
      } catch(e) {
        addFailure(batch.at(0)!.transactionHash, label);
        break process_loop;
      }

      startProcessor = undefined;
    }
  }

  await uploadResults(results, event.Records.map(r => r.receiptHandle));

  if(failureCount > 0) {
    throw new Error('Some handlers failed');
  }
  
  return {};
}

export function parseTransactions(parsedRecords: Array<ParsedRecord>, s3Results: Map<any, any>) {
  const transactions: Array<Transaction> = [];
  for (const record of parsedRecords) {
    const payload = record.data;
    var txs = [];
    if (payload.type === "non-batch") {
      txs = payload.data;
    } else {
      txs = s3Results.get(record.id);
    }
    transactions.push(...txs);
  }
  return transactions;
}

type GetInitialisationOptions = {
  parsedTxs: Array<Transaction>;
  isRetry: boolean
}

export async function getInitialisation(options: GetInitialisationOptions) {
  if(!options.isRetry) {
    return {
      startTransactionIdx: 0,
      startProcessor: undefined
    }
  }

  const pipeline = await axios.get("http://localhost:4121/pipeline").then((r) => r.data);
  const txIdx = findErrorTxIdx(options.parsedTxs, pipeline);

  return {
    startTransactionIdx: txIdx,
    startProcessor: pipeline.ErrorLabel_
  }
}


export function findErrorTxIdx(parsedTxs: Array<Transaction>, pipeline: any) {
  const index = parsedTxs.findIndex((v) => pipeline.ErrorTx_ === v.transactionHash);
  if(index === -1) throw new Error('Index for failed tx not found');

  return index;
}

export async function uploadResults(results: Array<TransactionResult>, message_ids: Array<string>) {
  await axios.post("http://localhost:4121/results", { results, message_ids }).then(console.log);
}

export function getNextTransactionBatch(iterator: TransactionIterator) {
  const batch: Array<Transaction> = [];

  // tx at the front of parsedTxs
  const frontTx = iterator.peek()
  const processors = getEligibleTxConfigs(frontTx, allTxConfigsWithLabels);

  // batch transactions that can be processed by the exact same processors
  while (
    iterator.hasNext() &&
    sameEligibleProcessors(
      processors,
      getEligibleTxConfigs(iterator.peek(), allTxConfigsWithLabels)
    )
  ) {
    const tx = iterator.next()!;
    batch.push(tx);
  }

  return {
    batch,
    processors
  };
}

export async function getS3Results(batchRecords: Array<ParsedRecord>) {
  const s3Results = new Map();

  await Promise.all(
    batchRecords
      .filter((r) => r.data.type === "batch")
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
  var failureCount = 0;
  var successCount = 0;

  function addSuccessful(txHash: string, handler: string) {
    if(!txHashIdx.has(txHash)) {
      txHashIdx.set(txHash, results.length);
      results.push({
        transaction_hash: txHash,
        successful_labels: [],
        failed_label: undefined
      });
    }

    results[txHashIdx.get(txHash)!]!.successful_labels.push(handler);
    successCount++;
  }

  function addFailure(txHash: string, handler: string) {
    if(!txHashIdx.has(txHash)) {
      txHashIdx.set(txHash, results.length);
      results.push({
        transaction_hash: txHash,
        successful_labels: [],
        failed_label: undefined
      });
    }

    results[txHashIdx.get(txHash)!]!.failed_label = handler;
    failureCount++
  }

  return {
    addSuccessful,
    addFailure,
    results,
    failureCount,
    successCount
  }
}

// Eligible Tx configs are configs that match the given transaction
export function getEligibleTxConfigs(tx: any, allTxConfigs: Array<any>): Array<EligibleTxConfig> {
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

export function sameEligibleProcessors(processorsA: Array<any>, processorsB: Array<any>) {
  let seen = new Set();

  if (processorsA.length != processorsB.length) return false;

  for (const p of processorsA) {
    seen.add(p.label);
  }

  for (const p of processorsB) {
    if (!seen.has(p.label)) {
      return false;
    }
  }

  return true;
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
      strict: true,
    });

    log.eventName = decodedEvent.eventName;
    log.args = decodedEvent.args;

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
    (isAddressEqual(logConfig._origin, logIdentifier.address) &&
      logConfig._topics.at(0) === logIdentifier.signature) ||
    (!logConfig.address && logConfig._topics.at(0) === logIdentifier.signature)
  );
}


class TransactionIterator {
  #transactions: Array<Transaction>;
  #index: number;

  constructor(transactions: Array<Transaction>, startIndex: number) {
    this.#transactions = transactions
    this.#index = startIndex;
  }
 
  hasNext() {
    return this.#index < this.#transactions.length;
  }
 
  next() {
    return this.#transactions[this.#index++];
  } 

  peek() {
    return this.#transactions[this.#index];
  }
}

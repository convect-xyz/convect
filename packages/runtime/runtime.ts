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

// Delete API Keys
const MUST_REMOVE_CONVECT_TBK = process.env.MUST_REMOVE_CONVECT_TBK;
delete process.env.MUST_REMOVE_CONVECT_TBK;

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

export async function handler(event: SQSEvent) {
  const parsedTxs = [];

  console.time("parse");
  const records: Array<ParsedRecord> = event.Records.map((record) => ({
    id: record.messageId,
    isRetry: Number(record.attributes.ApproximateReceiveCount) > 1,
    data: JSON.parse(record.body),
  }));
  const isRetry = event.Records.some((r) => Number(r.messageAttributes.ApproximateReceiveCount) > 1)
  
  const s3Results = await getS3Results(records);

  for (const record of records) {
    const payload = record.data;
    var txs = [];
    if (payload.type === "non-batch") {
      txs = payload.data;
    } else {
      txs = s3Results.get(record.id);
    }
    parsedTxs.push(...txs);
  }
  console.timeEnd("parse");

  const txHashIdx = new Map<string, number>();
  const results: Array<TransactionResult> = [];

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
  }

  var hasError = false;
  let i = 0;
  process_loop:
  while (i < parsedTxs.length) {
    const batch: Array<any> = [];

    console.time("organise");
    // tx at the front of parsedTxs
    const frontTx = parsedTxs.at(i);
    const processors = getEligibleTxConfigs(frontTx, allTxConfigsWithLabels);

    // batch transactions that can be processed by the exact same processors
    while (
      i < parsedTxs.length &&
      sameEligibleProcessors(
        processors,
        getEligibleTxConfigs(parsedTxs[i], allTxConfigsWithLabels)
      )
    ) {
      const tx = parsedTxs[i];
      batch.push(tx);
      i++;
    }
    console.timeEnd("organise");
    
    for (const { label, config: txConfig } of processors) {
      try {
        const _ = await txConfig._handler(batch.map((tx) => decodeTx(tx, txConfig)));
        batch.map((tx) => addSuccessful(tx.transactionHash, label))
      } catch(e) {
        addFailure(batch.at(0)!.transactionHash, label);
        break process_loop;
      }
    }
  }

  await uploadResults(results);
  if(hasError) {
    throw new Error('Some handlers failed');
  }
  
  return {};
}

export async function uploadResults(results: Array<TransactionResult>) {
  await axios.post("http://localhost:4121/results", { results });
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

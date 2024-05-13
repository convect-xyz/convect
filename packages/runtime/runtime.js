import axios from "axios";
import { v4 } from "uuid";
import { decodeEventLog, isAddressEqual } from "viem";

import pipeline from "./pipeline";

export async function handler(event) {
  const parsedTxs = [];

  const records = event.Records.map((record) => ({
    id: v4(),
    data: JSON.parse(record.body),
  }));

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

  let i = 0;
  while (i < parsedTxs.length) {
    const batch = [];
    // tx at the front of parsedTxs
    const frontTx = parsedTxs.at(i);
    const processors = getEligibleTxConfigs(
      frontTx,
      Object.values(pipeline.transactions)
    );

    console.log("Eligible Processors:", processors);

    // batch matching transactions
    while (i < parsedTxs.length && txMatches(frontTx, parsedTxs[i])) {
      const tx = parsedTxs[i];
      batch.push(tx);
      i++;
    }

    console.log("Batch Size:", batch.length);

    for (const txConfig of processors) {
      if (txConfig._independent) {
        await Promise.all(
          batch.map((tx) => txConfig._handler(decodeTx(tx, txConfig)))
        );
      } else {
        await txConfig._handler(batch.map((tx) => decodeTx(tx, txConfig)));
      }
    }
  }

  return {};
}

export async function getS3Results(batchRecords) {
  const s3Results = new Map();

  await Promise.all(
    batchRecords
      .filter((r) => r.data.type === "batch")
      .map((r) =>
        axios.get(r.data.download_url).then(async (r) => {
          s3Results.set(r.id, JSON.parse(r.data));
        })
      )
  );

  return s3Results;
}

// Eligible Tx configs are configs that match the given transaction
export function getEligibleTxConfigs(tx, txConfigs) {
  const eligibleTxConfigs = [];

  const txLogIdentifiers = getUniqueLogIdentifiers(tx);
  const allTxConfigs = txConfigs;

  for (const config of allTxConfigs) {
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
      eligibleTxConfigs.push(config);
    }
  }

  return eligibleTxConfigs.sort(txConfigComparison(tx));
}

export function txConfigComparison(tx) {
  const identifiers = getUniqueLogIdentifiers(tx);
  return (txConfigA, txConfigB) => {
    for (const identifier of identifiers) {
      if (
        txConfigA._logMap.get(identifier.signature) &&
        txConfigB._logMap.get(log.signature)
      ) {
        continue;
      }

      if (txConfigA._logMap.get(identifier.signature)) return -1;

      if (txConfigB._logMap.get(identifier.signature)) return 1;
    }

    return 0;
  };
}

export function txMatches(baseTx, txToMatch) {
  const baseTxLogIdentifiers = getUniqueLogIdentifiers(baseTx).reduce(
    (acc, curr) => {
      acc.set(curr.signature, curr.address);
      return acc;
    },
    new Map()
  );

  const txToMatchLogIdentifiers = getUniqueLogIdentifiers(txToMatch).reduce(
    (acc, curr) => {
      acc.set(curr.signature, curr.address);
      return acc;
    },
    new Map()
  );

  return [...baseTxLogIdentifiers.keys()].every(
    (k) =>
      txToMatchLogIdentifiers.has(k) &&
      txToMatchLogIdentifiers.get(k) === baseTxLogIdentifiers.get(k)
  );
}

export function getUniqueLogIdentifiers(tx) {
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

export function getLogIdentifier(txLogIdentifier) {
  return {
    signature: txLogIdentifier.topics.at(0),
    address: txLogIdentifier.address,
  };
}

export function decodeTx(tx, txConfig) {
  const newTx = { ...tx, logs: [] };

  for (const log of tx.logs) {
    var topic = log.topics.at(0);
    const logConfig = txConfig._logMap.get(topic);

    if (!logConfig) continue;

    const decodedEvent = decodeEventLog({
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

export function logConfigMatches(logConfig, logIdentifier) {
  return (
    (isAddressEqual(logConfig._origin, logIdentifier.address) &&
      logConfig._topics.at(0) === logIdentifier.signature) ||
    (!logConfig.address && logConfig._topics.at(0) === logIdentifier.signature)
  );
}

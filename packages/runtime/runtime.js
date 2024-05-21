import { Lambda } from "@aws-sdk/client-lambda";
import axios from "axios";
import { v4 } from "uuid";
import { decodeEventLog, isAddressEqual } from "viem";
import pipeline from "./pipeline";

const allTxConfigs = Object.values(pipeline);
const allTxConfigsWithLabels = [...Object.entries(pipeline)];

const lambda = new Lambda({ region: "eu-west-1" });

export async function handler(event) {
  const parsedTxs = [];

  console.time("parse");
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
  console.timeEnd("parse");

  var succeeded = new Map();

  let i = 0;
  while (i < parsedTxs.length) {
    const batch = [];

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
      succeeded.set(tx.transactionHash, []);
      i++;
    }
    console.timeEnd("organise");

    for (const { label, config: txConfig } of processors) {
      if (txConfig._independent) {
        await Promise.all(
          batch.map((tx) =>
            txConfig
              ._handler(decodeTx(tx, txConfig))
              .then(() => succeeded.get(tx.transactionHash).push(label))
          )
        );
      } else {
        await txConfig
          ._handler(batch.map((tx) => decodeTx(tx, txConfig)))
          .then((batch) =>
            batch.map((tx) => succeeded.get(tx.transactionHash).push(label))
          );
      }
    }
  }

  await report({
    transactions: Object.fromEntries(succeeded),
  });

  return {};
}

export async function report(options) {
  console.time("report");
  await lambda.invokeAsync({
    FunctionName: `arn:aws:lambda:eu-west-1:730335604495:function:reporting-${process.env.HANDLER_ID}`,
    InvokeArgs: JSON.stringify({
      transactions: options.transactions,
    }),
  });
  console.timeEnd("report");
}

export async function getS3Results(batchRecords) {
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
export function getEligibleTxConfigs(tx, allTxConfigs) {
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

export function txConfigComparison(tx) {
  const identifiers = getUniqueLogIdentifiers(tx);
  return (txConfigA, txConfigB) => {
    for (const identifier of identifiers) {
      if (
        txConfigA.config._logMap.get(identifier.signature) &&
        txConfigB.config._logMap.get(log.signature)
      ) {
        continue;
      }

      if (txConfigA.config._logMap.get(identifier.signature)) return -1;

      if (txConfigB.config._logMap.get(identifier.signature)) return 1;
    }

    return 0;
  };
}

export function sameEligibleProcessors(processorsA, processorsB) {
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

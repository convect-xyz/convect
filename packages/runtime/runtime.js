import { decodeEventLog, pad } from 'viem';
import pipeline from './pipeline';

export async function handler(event, context) {
  const txs = [];
  for(const record of event.Records) {
    txs.push(...JSON.parse(record.body));
  }

  const firstTx = txs.at(0);
  if(!firstTx) return;

  const txHandler = Object.entries(pipeline.handlers).find(([name, _]) => name === firstTx.id).at(1);

  const parsedTxs = [];
  for(const tx of txs) {
    const txLogs = new Map();
    
    for(const [name, logs] of Object.entries(tx.logs)) {
      txLogs.set(name, logs.map((log) => {
        
        return {
          ...log,
          ...decodeEventLog({
            abi: txHandler.abi,
            data: pad(log.data, {
              size: 64
            }),
            topics: log.topics
          })
        }
      }))
    }

    parsedTxs.push(Object.fromEntries(txLogs));
  }

  await txHandler.handler(parsedTxs);

  return {}
}

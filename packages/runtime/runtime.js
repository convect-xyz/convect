import pipeline from './pipeline';

export async function handler(event, context) {
  const txs = [];
  for(const record of event.Records) {
    txs.push(...JSON.parse(record.body));
  }

  await pipeline.handler(txs);

  return {}
}

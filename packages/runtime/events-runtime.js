import pipeline from './pipeline';

export async function handler(event, context) {
  const type = event.type;

  if(type === "Create") {
    return await pipeline.onCreate?.() ?? {};
  }

  if(type === "Destroy") {
    await pipeline.onDestroy?.();
  }

  if(type === "Reset") {
    await pipeline.onReset?.();
  }

  return {}
}

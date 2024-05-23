import { onCreate } from './pipeline';

export async function handler(event, context) {
  const type = event.type;

  if(type === "Create") {
    return await onCreate?.() ?? {};
  }

  // if(type === "Destroy") {
  //   await onDestroy?.();
  // }

  // if(type === "Reset") {
  //   await onReset?.();
  // }

  return {}
}

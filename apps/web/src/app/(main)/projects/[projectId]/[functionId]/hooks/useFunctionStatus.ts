import { useFunction } from "./useFunction";

export function useFunctionStatus() {
  return useFunction({
    select: (data) => ({
      isRunning: data.status === "RUNNING",
      isPending: data.status === "PENDING",
      isDestroying: data.status === "DESTROYING",
    }),
  });
}

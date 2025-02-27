import { formatDistanceStrict } from "date-fns";
import { useEffect, useState } from "react";

export function useRunningLabel(
  runningAt?: number | null,
  finishedAt?: number | null,
) {
  const [_, setValue] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setValue((prevValue) => prevValue + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!runningAt && !finishedAt) return null;
  if (!runningAt) {
    return null;
  }

  if (!finishedAt) {
    finishedAt = new Date().getTime();
  }

  return formatDistanceStrict(finishedAt, runningAt);
}

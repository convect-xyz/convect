"use client";

import { formatDistanceToNow } from "date-fns";
import { ForceRerender } from "~/components/ui/force-rerender";
import { cn } from "~/lib/utils";
import { RouterOutputs } from "~/trpc/shared";

type Batch = RouterOutputs["functions"]["getBatches"]["batches"][0];

export default function BatchRow(props: {
  batch: Batch;
  onRowSelected?: (batch: Batch) => void;
}) {
  const { batch: batch, onRowSelected } = props;

  return (
    <button
      className="flex items-center gap-2 py-4 hover:bg-muted active:bg-muted/80"
      onClick={() => onRowSelected?.(batch)}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          batch.result?.status === "SUCCESS" && "bg-green-400",
          batch.result?.status === "FAILED" && "bg-red-400",
          !batch.result && "bg-gray-400",
        )}
      ></span>
      <div className="flex-1 text-left">{batch.batchId}</div>
      <div className="flex items-center justify-center rounded-full border px-2 text-xs text-muted-foreground">
        {batch.result?.numAttempts ?? "0"}{" "}
        {batch.result?.numAttempts === 1 ? "attempt" : "attempts"}
      </div>
      <div className="flex items-center justify-center rounded-full border px-2 text-xs text-muted-foreground">
        {batch.numTransactions ?? "0"}{" "}
        {batch.numTransactions === 1 ? "tx" : "txs"}
      </div>
      <div className="text-sm text-muted-foreground">
        <ForceRerender>
          {batch.result &&
            formatDistanceToNow(batch.result.mostRecentAttemptTimestampMs, {
              addSuffix: true,
            })}
        </ForceRerender>
      </div>
    </button>
  );
}

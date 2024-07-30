"use client";

import { formatDistanceToNow } from "date-fns";
import { ForceRerender } from "~/components/ui/force-rerender";
import { cn } from "~/lib/utils";
import { RouterOutputs } from "~/trpc/shared";

type Transaction =
  RouterOutputs["handlers"]["getTransactions"]["transactions"][0];

export default function TransactionRow(props: {
  tx: Transaction;
  onRowSelected?: (tx: Transaction) => void;
}) {
  const { tx, onRowSelected } = props;

  return (
    <button
      className="flex items-center gap-2 py-4 hover:bg-muted active:bg-muted/80"
      onClick={() => onRowSelected?.(tx)}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          tx.status === "SUCCESS" && "bg-green-400",
          tx.status === "FAILED" && "bg-red-400",
        )}
      ></span>
      <div className="flex-1 text-left">{tx.transactionHash}</div>
      <div className="text-sm text-muted-foreground">
        <ForceRerender>
          {formatDistanceToNow(tx.timestamp, { addSuffix: true })}
        </ForceRerender>
      </div>
    </button>
  );
}

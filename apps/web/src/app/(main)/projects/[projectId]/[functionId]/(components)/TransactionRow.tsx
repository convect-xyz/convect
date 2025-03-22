"use client";

import { formatDistanceToNow } from "date-fns";
import { ChevronRightIcon } from "lucide-react";
import { ForceRerender } from "~/components/ui/force-rerender";
import { cn } from "~/lib/utils";
import { RouterOutputs } from "~/trpc/shared";

type Transaction =
  RouterOutputs["functions"]["getTransactions"]["transactions"][0];

export default function TransactionRow(props: {
  tx: Transaction;
  onRowSelected?: (tx: Transaction) => void;
}) {
  const { tx, onRowSelected } = props;

  return (
    <button
      className="flex w-full items-center gap-2 p-4 hover:bg-background active:bg-muted/80"
      onClick={() => onRowSelected?.(tx)}
    >
      <div className="flex flex-1 flex-col gap-2 overflow-hidden">
        <div className="flex-1 truncate text-left text-sm">
          {tx.transactionHash}
        </div>
        <div className="flex justify-between gap-2">
          <div className="flex items-center justify-center gap-2 rounded-full border px-2 text-xs text-muted-foreground">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                tx.result?.status === "SUCCESS" && "bg-green-400",
                tx.result?.status === "FAILED" && "bg-red-400",
                !tx.result && "bg-gray-400",
              )}
            ></span>
            <span>
              {tx.result?.successCount ?? "0"} / {tx.txConfigs.length}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            <ForceRerender>
              {formatDistanceToNow(tx.timestamp, { addSuffix: true })}
            </ForceRerender>
          </div>
        </div>
      </div>
      <div>
        <ChevronRightIcon className="text-muted-foreground" size={16} />
      </div>
    </button>
  );
}

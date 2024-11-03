"use client";

import { Manifest } from "@convect-xyz/lib";
import { formatDistanceToNow } from "date-fns";
import { ForceRerender } from "~/components/ui/force-rerender";
import { cn } from "~/lib/utils";
import { RouterOutputs } from "~/trpc/shared";

type Transaction =
  RouterOutputs["functions"]["getInvocations"]["invocations"][0];

export default function InvocationRow(props: {
  tx: Transaction;
  manifest: Manifest;
}) {
  const { tx, manifest } = props;

  const txConfig = manifest.tx_configs[Number(tx.label)];
  return (
    <div className="flex items-center gap-2 py-2">
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          tx.status === "SUCCESS" && "bg-green-400",
          tx.status === "FAILED" && "bg-red-400",
        )}
      ></span>
      <div className="flex-1 text-left">
        <div className="w-min rounded-full border px-2 py-1 text-xs text-muted-foreground">
          {txConfig?.name}
        </div>
      </div>
      <div className="text-xs text-muted-foreground">
        <ForceRerender>
          {formatDistanceToNow(tx.timestamp, { addSuffix: true })}
        </ForceRerender>
      </div>
    </div>
  );
}

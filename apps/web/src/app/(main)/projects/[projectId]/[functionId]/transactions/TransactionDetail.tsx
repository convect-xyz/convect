import { formatDistanceToNow } from "date-fns";
import { HelpCircleIcon } from "lucide-react";
import InfoTooltip from "~/components/core/InfoTooltip";
import { ForceRerender } from "~/components/ui/force-rerender";
import { cn } from "~/lib/utils";
import { useSelectedDeployment } from "../hooks/useSelectedDeployment";
import { useTransaction } from "../hooks/useTransaction";

export function TransactionDetail(props: { transactionHash?: string }) {
  const { data: transaction } = useTransaction({
    transactionHash: props.transactionHash,
  });

  if (!props.transactionHash) {
    return <div>No Transaction Selected.</div>;
  }

  if (!transaction) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="border-b p-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="text-xl font-semibold">
            {props.transactionHash.substring(0, 10)}...
            {props.transactionHash.substring(props.transactionHash.length - 10)}
          </div>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          Queued on{" "}
          {Intl.DateTimeFormat("en-US", {
            dateStyle: "full",
            timeStyle: "medium",
          }).format(transaction.transaction.timestamp)}
        </div>
      </div>
      <div className="mt-4">
        <ProcessedInformation transactionHash={props.transactionHash} />
      </div>
    </div>
  );
}

function ProcessedInformation(props: { transactionHash: string }) {
  const { data: transaction } = useTransaction({
    transactionHash: props.transactionHash,
  });
  const { data: deployment } = useSelectedDeployment();

  if (!transaction || !deployment) {
    return null;
  }

  const getTxConfig = (txConfig: number) => {
    return deployment.deployment.manifest.tx_configs[txConfig]!;
  };

  return (
    <div className="px-4">
      <div className="flex items-center justify-between">
        <div>Handlers</div>

        <InfoTooltip text="The handlers that process this transaction">
          <HelpCircleIcon size={18} />
        </InfoTooltip>
      </div>
      <div className="mt-4 flex flex-col divide-y rounded-md border">
        {transaction.transaction.txConfigs.map((txConfigIdx) => {
          const txConfig = getTxConfig(txConfigIdx);
          const attempt = transaction.transaction.mostRecentAttempts.find(
            (attempt) => attempt.handler === txConfigIdx.toString(),
          );

          return (
            <div className="flex items-center gap-2 p-4" key={txConfig.name}>
              <span
                className={cn(
                  "h-2 w-2 rounded-full bg-gray-500",
                  attempt?.status === "SUCCESS" && "bg-green-400",
                  attempt?.status === "FAILED" && "bg-red-400",
                )}
              ></span>
              <div className="flex-1 text-left">
                <div className="w-min px-2 py-1 text-xs text-muted-foreground">
                  {txConfig?.name}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {attempt && (
                  <ForceRerender>
                    {formatDistanceToNow(attempt.timestamp, {
                      addSuffix: true,
                    })}
                  </ForceRerender>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

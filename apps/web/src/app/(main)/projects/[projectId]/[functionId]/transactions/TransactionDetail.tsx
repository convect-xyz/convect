import { formatDistanceToNow } from "date-fns";
import { CopyIcon, HelpCircleIcon } from "lucide-react";
import CopyButton from "~/components/core/CopyButton";
import InfoTooltip from "~/components/core/InfoTooltip";
import { ForceRerender } from "~/components/ui/force-rerender";
import { getExplorerTxUrl } from "~/lib/shared/utils/chains";
import { cn } from "~/lib/utils";
import { useParams } from "../hooks/useParams";
import { useSelectedDeployment } from "../hooks/useSelectedDeployment";
import { useTransaction } from "../hooks/useTransaction";

export function TransactionDetail(props: { transactionHash?: string }) {
  const { data: transaction } = useTransaction({
    transactionHash: props.transactionHash,
  });

  if (!props.transactionHash) {
    return (
      <div className="flex h-full items-center justify-center">
        Select a transaction to view details.
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="flex h-full items-center justify-center">Loading...</div>
    );
  }

  return (
    <div>
      <div className="flex h-[60px] items-center border-b bg-black p-4 py-2">
        <div>
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">
              {props.transactionHash.substring(0, 10)}...
              {props.transactionHash.substring(
                props.transactionHash.length - 10,
              )}
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
      </div>
      <div className="mt-4">
        <TransactionInformation transactionHash={props.transactionHash} />
      </div>
      <div className="mt-4">
        <Handlers transactionHash={props.transactionHash} />
      </div>
      <div className="mt-4">
        <ErrorInformation transactionHash={props.transactionHash} />
      </div>
    </div>
  );
}

function Handlers(props: { transactionHash: string }) {
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
              <InfoTooltip
                text={Intl.DateTimeFormat("en-US", {
                  dateStyle: "full",
                  timeStyle: "medium",
                }).format(transaction.transaction.timestamp)}
              >
                <div className="text-xs text-muted-foreground underline decoration-dashed">
                  {attempt && (
                    <ForceRerender>
                      {formatDistanceToNow(attempt.timestamp, {
                        addSuffix: true,
                      })}
                    </ForceRerender>
                  )}
                </div>
              </InfoTooltip>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ErrorInformation(props: { transactionHash: string }) {
  const { data: transaction } = useTransaction({
    transactionHash: props.transactionHash,
  });
  const { data: deployment } = useSelectedDeployment();

  if (
    !transaction ||
    !deployment ||
    transaction.transaction.result?.status.status !== "FAILED"
  ) {
    return null;
  }

  const status = transaction.transaction.result.status;
  const getTxConfig = (txConfig: number) => {
    return deployment.deployment.manifest.tx_configs[txConfig]!;
  };

  return (
    <div className="px-4">
      <div className="flex items-center justify-between">
        <div>Error</div>

        <InfoTooltip text="The error emmitted when processing the batch this transaction belongs to.">
          <HelpCircleIcon size={18} />
        </InfoTooltip>
      </div>
      <div className="mt-4 flex flex-col divide-y rounded-md border">
        {status.message}
      </div>
    </div>
  );
}

function TransactionInformation(props: { transactionHash: string }) {
  const { data: transaction } = useTransaction({
    transactionHash: props.transactionHash,
  });
  const { chainId } = useParams();
  const { data: deployment } = useSelectedDeployment();

  if (!transaction || !deployment || !chainId) {
    return null;
  }

  const transactionUrl = getExplorerTxUrl(chainId, props.transactionHash);
  return (
    <div className="px-4">
      <div className="flex items-center justify-between">
        <div>Transaction Information</div>
      </div>
      <div className="mt-4 flex flex-col gap-4 rounded-md border p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Transaction Hash</div>
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">
              {props.transactionHash.substring(0, 10)}...
              {props.transactionHash.substring(
                props.transactionHash.length - 10,
              )}
            </div>
            <CopyButton text={props.transactionHash}>
              <CopyIcon size={14} />
            </CopyButton>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Explorer Link</div>
          <div className="text-sm text-muted-foreground">
            {transactionUrl && (
              <a href={transactionUrl} target="_blank" rel="noreferrer">
                View on Explorer
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

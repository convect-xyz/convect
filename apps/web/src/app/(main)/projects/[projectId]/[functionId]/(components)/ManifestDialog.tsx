import { getStructuredManifest, Manifest } from "@convect-xyz/lib";
import { DialogProps, Portal } from "@radix-ui/react-dialog";
import { formatAbiItem } from "abitype";
import { useState } from "react";
import ChainIcon from "~/components/icons/ChainIcon";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

export default function ManifestDialog(
  props: DialogProps & {
    manifest: Manifest;
  },
) {
  return (
    <Dialog {...props}>
      <DialogContent className="flex h-full max-h-[84%] max-w-lg flex-col gap-6 overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manifest</DialogTitle>
        </DialogHeader>
        <RenderManifest manifest={props.manifest} />
      </DialogContent>
    </Dialog>
  );
}

function RenderManifest(props: { manifest: Manifest }) {
  const structuredManifest = getStructuredManifest(props.manifest);
  const [selectedChainId, setSelectedChainId] = useState<string | undefined>(
    structuredManifest.chains[0]?.chainId.toString(),
  );

  const isChainSelected = (chainId: number) => {
    return selectedChainId === chainId.toString();
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="mt-2 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Transaction Configurations
          </div>
          <Tabs onValueChange={setSelectedChainId} value={selectedChainId}>
            <TabsList className="h-auto rounded-full border">
              {structuredManifest.chains.map((chain) => (
                <TabsTrigger
                  key={chain.chainId}
                  value={chain.chainId.toString()}
                  className="gap-2 rounded-full px-1 text-xs"
                >
                  <ChainIcon chainId={chain.chainId} />
                  {isChainSelected(chain.chainId) ? <>{chain.name}</> : <></>}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <RenderTransactionConfigs
          manifest={props.manifest}
          selectedChainId={selectedChainId}
        />
      </div>
    </div>
  );
}

function RenderTransactionConfigs(props: {
  manifest: Manifest;
  selectedChainId: string | undefined;
}) {
  const structuredManifest = getStructuredManifest(props.manifest);
  const { selectedChainId } = props;

  return (
    <div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-2">
        {structuredManifest.txConfigs.map((txConfig) => {
          const getStartBlock = () => {
            if (!selectedChainId) {
              return undefined;
            }

            return txConfig.startBlock[selectedChainId.toString()];
          };

          const startBlock = getStartBlock();
          return (
            <div className="rounded-md border bg-card p-2">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="rounded-ful px-2 py-1 text-xs text-white">
                  {txConfig.name}
                </div>
                <div className="rounded-full py-1 pl-2 text-xs">
                  <span className="text-muted-foreground">Start Block / </span>
                  {startBlock
                    ? new Intl.NumberFormat("en-US").format(startBlock)
                    : "-"}
                </div>
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {txConfig.logConfigs.map((logConfig) => {
                  const getAddress = (
                    address: string | Record<string, string>,
                  ) => {
                    if (!selectedChainId) {
                      return undefined;
                    }

                    if (typeof address === "string") {
                      return address;
                    }

                    return address[selectedChainId.toString()];
                  };

                  return (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="w-auto rounded-full border px-3 py-1 text-xs text-muted-foreground">
                          {logConfig.abi.name}
                        </button>
                      </TooltipTrigger>
                      <Portal>
                        <TooltipContent>
                          <div className="text-xs text-muted-foreground">
                            {getAddress(logConfig.address)}
                          </div>
                          <div className="text-md mt-1">
                            {formatAbiItem(logConfig.abi)}
                          </div>
                        </TooltipContent>
                      </Portal>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

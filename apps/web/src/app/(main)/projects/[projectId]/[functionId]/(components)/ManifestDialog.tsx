import { getStructuredManifest, Manifest } from "@convect-xyz/lib";
import { DialogProps } from "@radix-ui/react-dialog";
import { formatAbiItem } from "abitype";
import { useState } from "react";
import ChainIcon from "~/components/icons/ChainIcon";
import { Card, CardContent } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";

export default function ManifestDialog(
  props: DialogProps & {
    manifest: Manifest;
  },
) {
  return (
    <Dialog {...props}>
      <DialogContent className="flex h-full max-h-[84%] max-w-screen-lg flex-col gap-6 overflow-y-auto">
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
          <div className="text-sm uppercase text-muted-foreground">
            Transaction Configurations
          </div>
          <Tabs onValueChange={setSelectedChainId} value={selectedChainId}>
            <TabsList className="rounded-full">
              {structuredManifest.chains.map((chain) => (
                <TabsTrigger
                  key={chain.chainId}
                  value={chain.chainId.toString()}
                  className="gap-2 rounded-full"
                >
                  <ChainIcon chainId={chain.chainId} />
                  {isChainSelected(chain.chainId) ? <>{chain.name}</> : <></>}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <div>
          <div className="flex flex-col gap-2">
            {structuredManifest.txConfigs.map((txConfig) => {
              const getStartBlock = () => {
                if (!selectedChainId) {
                  return undefined;
                }

                return txConfig.startBlock[selectedChainId.toString()];
              };

              const startBlock = getStartBlock();
              return (
                <Card>
                  <CardContent className="p-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="rounded-full border bg-white px-2 py-1 text-xs">
                          <span className="text-background">
                            {txConfig.name}
                          </span>
                        </div>
                        <div className="rounded-full border px-2 py-1 text-xs">
                          <span className="text-muted-foreground">
                            Start Block /{" "}
                          </span>
                          {startBlock
                            ? new Intl.NumberFormat("en-US").format(startBlock)
                            : "-"}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-col gap-1">
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
                            <Card
                              key={logConfig.topics.join(",")}
                              className="bg-background"
                            >
                              <CardContent className="p-3">
                                <div className="flex flex-col gap-1">
                                  <div className="text-sm">
                                    {formatAbiItem(logConfig.abi)}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {getAddress(logConfig.address)}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

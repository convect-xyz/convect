"use client";

import {
  getStructuredManifest,
  Manifest,
  StructuredManifest,
} from "@convect-xyz/lib";
import { Portal } from "@radix-ui/react-tooltip";
import { formatAbiItem } from "abitype";
import { InfoIcon } from "lucide-react";
import { PropsWithChildren, useState } from "react";
import { toast } from "sonner";
import InfoTooltip from "~/components/core/InfoTooltip";
import ChainIcon from "~/components/icons/ChainIcon";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import { Form } from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";
import { Switch } from "~/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { api } from "~/trpc/react";
import {
  useManifestForm,
  useManifestFormContext,
  useManifestFormHelpers,
} from "./hooks/useManifestForm";
import { useDeployment } from "./hooks/usePendingDeployment";

export default function Page(props: {}) {
  const manifestForm = useManifestForm();

  return (
    <Form {...manifestForm}>
      <div>
        <Header />
        <div className="mx-auto w-full max-w-screen-md px-4 pb-10">
          <Main />
        </div>
      </div>
    </Form>
  );
}

function Header() {
  const { data: deployment, refetch } = useDeployment();
  const manifest = useManifestFormContext();
  const { mutateAsync: confirmDeploymentAsync, isPending } =
    api.functions.confirmDeployment.useMutation({
      onSuccess: () => {
        refetch();
        toast("Deployment confirmed");
      },
    });
  if (!deployment) {
    return null;
  }

  return (
    <div className="border-b bg-black py-10">
      <div className="mx-auto w-full max-w-screen-md px-4">
        <div className="flex items-center justify-between">
          <div className="text-3xl">
            Deployment {deployment.deployment.id.slice(0, 6)}
          </div>
          {deployment.deployment.isWaitingForApproval && (
            <Button
              isLoading={isPending}
              onClick={() =>
                confirmDeploymentAsync({
                  deploymentId: deployment.deployment.id,
                  manifest: manifest.getValues(),
                })
              }
            >
              Deploy
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Main(props: PropsWithChildren) {
  const { data: deployment } = useDeployment();
  const manifestForm = useManifestFormContext();

  if (
    !deployment ||
    !manifestForm.getValues() ||
    Object.keys(manifestForm.getValues()).length === 0
  ) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <RenderManifest manifest={manifestForm.getValues()} />
    </div>
  );
}

function RenderManifest(props: {
  manifest: Manifest;
  initialChainId?: number;
}) {
  const structuredManifest = getStructuredManifest(props.manifest);
  const [selectedChainId, setSelectedChainId] = useState<string | undefined>(
    structuredManifest.chains[0]?.chainId.toString(),
  );
  return (
    <div className="mt-4 flex flex-col gap-2">
      {structuredManifest.chains.length > 1 && (
        <div className="flex items-center justify-end">
          <Tabs onValueChange={setSelectedChainId} value={selectedChainId}>
            <TabsList className="h-auto  rounded-full border">
              {structuredManifest.chains.map((chain) => (
                <TabsTrigger
                  key={chain.chainId}
                  value={chain.chainId.toString()}
                  className="gap-2 rounded-full border-none px-2 text-xs"
                >
                  <ChainIcon chainId={chain.chainId} />
                  {selectedChainId === chain.chainId.toString() && (
                    <div>{chain.name}</div>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      )}
      <ChainsSection
        manifest={props.manifest}
        selectedChainId={selectedChainId}
      />
      <TransactionConfigsSection
        manifest={props.manifest}
        selectChainId={selectedChainId}
      />
    </div>
  );
}

function ChainsSection(props: {
  manifest: Manifest;
  selectedChainId?: string;
}) {
  const structuredManifest = getStructuredManifest(props.manifest);
  const chain = structuredManifest.chains.find(
    (chain) => chain.chainId.toString() === props.selectedChainId,
  );
  if (!chain) {
    return null;
  }
  return (
    <div className="mt-2 flex flex-col gap-2">
      <ChainCard key={chain.chainId} chain={chain} manifest={props.manifest} />

      <StartBlockSection
        selectedChainId={chain.chainId.toString()}
        manifest={props.manifest}
      />

      <EndBlockSection
        selectedChainId={chain.chainId.toString()}
        manifest={props.manifest}
      />
    </div>
  );
}

function ChainCard(props: {
  chain: StructuredManifest["chains"][0];
  manifest: Manifest;
}) {
  return (
    <div className="rounded-md border bg-muted px-4 shadow-sm">
      <div className="flex flex-col divide-y">
        <div className="flex justify-between py-4 text-sm">
          <span className="text-muted-foreground">Chain</span>
          <span>
            <div className="flex items-center gap-2">
              <ChainIcon chainId={props.chain.chainId} />
              <div className="flex flex-col gap-2">
                <div>{props.chain.name}</div>
              </div>
            </div>
          </span>
        </div>
      </div>
    </div>
  );
}

function StartBlockSection(props: {
  selectedChainId?: string;
  manifest: Manifest;
}) {
  const { selectedChainId } = props;
  const { backfill } = useManifestFormHelpers();
  const { data: manifest } = useDeployment();

  return (
    <div className="rounded-md border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-sm">Start Block</div>
          <InfoTooltip text="Configure your handler to start at a specific block. When this toggle is not checked, it will start at the latest block.">
            <InfoIcon size={14} className="text-muted-foreground" />
          </InfoTooltip>
        </div>

        <Switch
          disabled={!manifest?.deployment.isWaitingForApproval}
          checked={
            backfill.watchStartBlock(Number(selectedChainId)) !== undefined
          }
          onCheckedChange={() =>
            backfill.toggleStartBlock(Number(selectedChainId))
          }
        />
      </div>

      {backfill.watchStartBlock(Number(selectedChainId)) !== undefined && (
        <div className="text-xs">
          <div className="flex items-center justify-between pt-4">
            <div className="text-xs font-medium text-muted-foreground">
              Start Block
            </div>

            <div>
              <Input
                disabled={!manifest?.deployment.isWaitingForApproval}
                placeholder={new Intl.NumberFormat("en-US").format(
                  backfill.watchStartBlock(Number(selectedChainId)) ?? 0,
                )}
                value={backfill.watchStartBlock(Number(selectedChainId))}
                onChange={(e) => {
                  backfill.setStartBlock(
                    Number(selectedChainId),
                    e.target.value,
                  );
                }}
                className="h-auto w-full max-w-[80px] p-1 text-xs"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EndBlockSection(props: {
  selectedChainId?: string;
  manifest: Manifest;
}) {
  const { selectedChainId } = props;
  const { backfill } = useManifestFormHelpers();
  const { data: manifest } = useDeployment();

  return (
    <div className="rounded-md border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-sm">End Block</div>
          <InfoTooltip text="Configure your handler to stop at a specific block. When this value is not checked, it will follow the latest block.">
            <InfoIcon size={14} className="text-muted-foreground" />
          </InfoTooltip>
        </div>

        <Switch
          disabled={!manifest?.deployment.isWaitingForApproval}
          checked={
            backfill.watchEndBlock(Number(selectedChainId)) !== undefined
          }
          onCheckedChange={() =>
            backfill.toggleEndBlock(Number(selectedChainId))
          }
        />
      </div>

      {backfill.watchEndBlock(Number(selectedChainId)) !== undefined && (
        <div className="text-xs">
          <div className="flex items-center justify-between pt-4">
            <div className="text-xs font-medium text-muted-foreground">
              End Block
            </div>

            <div>
              <Input
                disabled={!manifest?.deployment.isWaitingForApproval}
                value={backfill
                  .watchEndBlock(Number(selectedChainId))
                  ?.toString()}
                onChange={(e) => {
                  backfill.setEndBlock(Number(selectedChainId), e.target.value);
                }}
                className="h-auto w-full max-w-[80px] p-1 text-xs"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TransactionConfigsSection(props: {
  manifest: Manifest;
  selectChainId?: string;
}) {
  return (
    <div className="mt-2 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-muted-foreground">
            Transaction Configurations
          </div>
          <InfoTooltip text="A transaction is only processed by a configuration if it contains logs that match all the event signatures.">
            <InfoIcon size={14} className="text-muted-foreground" />
          </InfoTooltip>
        </div>
      </div>
      <RenderTransactionConfigs
        manifest={props.manifest}
        selectedChainId={props.selectChainId}
      />
    </div>
  );
}

function RenderTransactionConfigs(props: {
  manifest: Manifest;
  selectedChainId: string | undefined;
}) {
  const structuredManifest = getStructuredManifest(props.manifest);
  const { selectedChainId } = props;

  const validTxConfigs = structuredManifest.txConfigs.filter(
    (txConfig) =>
      !txConfig.chains || txConfig.chains.includes(Number(selectedChainId)),
  );
  return (
    <div>
      <div className="flex flex-col gap-4">
        {validTxConfigs.map((txConfig, index) => (
          <TxConfigCard
            key={index}
            index={index}
            txConfig={txConfig}
            selectedChainId={
              selectedChainId ? Number(selectedChainId) : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}

function TxConfigCard(props: {
  index: number;
  txConfig: StructuredManifest["txConfigs"][0];
  selectedChainId: number | undefined;
}) {
  const { data: deployment } = useDeployment();
  const { txConfig, selectedChainId } = props;
  const helpers = useManifestFormHelpers();

  const getStartBlock = () => {
    if (!selectedChainId) {
      return undefined;
    }

    return txConfig.startBlock[selectedChainId.toString()];
  };

  const startBlock = getStartBlock();

  if (!deployment) {
    return null;
  }

  return (
    <Accordion
      type="single"
      collapsible
      className="w-full overflow-hidden rounded-md border bg-black"
    >
      <AccordionItem value="item-1" className="border-none">
        <AccordionTrigger className="p-4">
          <div className="w-full pr-2">
            <div className="flex items-center justify-between gap-2">
              <div className="rounded-full border bg-muted px-2 py-1 text-xs text-white">
                {txConfig.name}
              </div>

              <div className="flex items-center gap-1 rounded-full py-1 pl-2 text-xs">
                <span className="text-muted-foreground">Min. Block / </span>
                {new Intl.NumberFormat("en-US").format(startBlock!)}
              </div>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="bg-card p-0">
          <Separator />

          <div className="border-b p-4 text-sm">Events</div>
          <div className="bg-black px-4">
            <div className="flex flex-col divide-y">
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
                  <div
                    key={logConfig.abi.name}
                    className="flex w-auto items-center justify-between py-3 text-xs text-muted-foreground"
                  >
                    <div>{logConfig.abi.name}</div>
                    <div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="underline decoration-dashed">
                            {getAddress(logConfig.address)}
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
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

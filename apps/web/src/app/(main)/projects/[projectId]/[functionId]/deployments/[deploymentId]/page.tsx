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
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { api } from "~/trpc/react";
import { usePendingDeployment } from "./hooks/usePendingDeployment";

export default function Page(props: {}) {
  return (
    <div>
      <Header />
      <div className="mx-auto w-full max-w-screen-md px-4 pb-10">
        <Main />
      </div>
    </div>
  );
}

function Header() {
  const { data: deployment, refetch } = usePendingDeployment();
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
    <div className="border-b py-10">
      <div className="mx-auto w-full max-w-screen-md px-4">
        <div className="flex items-center justify-between">
          <div className="text-3xl">
            {deployment.function.project.name}/{deployment.function.name}
          </div>
          {deployment.deployment.status === "WAITING_FOR_APPROVAL" && (
            <Button
              isLoading={isPending}
              onClick={() =>
                confirmDeploymentAsync({
                  deploymentId: deployment.deployment.id,
                  manifest: deployment.deployment.manifest,
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
  const { data: deployment } = usePendingDeployment();

  if (!deployment) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <RenderManifest manifest={deployment.deployment.manifest} />
    </div>
  );
}

function RenderManifest(props: {
  manifest: Manifest;
  initialChainId?: number;
}) {
  return (
    <div className="mt-4 flex flex-col gap-2">
      <ChainsSection manifest={props.manifest} />
      <TransactionConfigsSection
        manifest={props.manifest}
        initialChainId={props.initialChainId}
      />
    </div>
  );
}

function ChainsSection(props: { manifest: Manifest }) {
  const structuredManifest = getStructuredManifest(props.manifest);

  return (
    <div className="mt-2 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground">Chains</div>
          <InfoTooltip text="These are all the chains that you intend to index.">
            <InfoIcon size={14} className="text-muted-foreground" />
          </InfoTooltip>
        </div>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-2">
        {structuredManifest.chains.map((chain) => (
          <ChainCard
            key={chain.chainId}
            chain={chain}
            manifest={props.manifest}
          />
        ))}
      </div>
    </div>
  );
}

function ChainCard(props: {
  chain: StructuredManifest["chains"][0];
  manifest: Manifest;
}) {
  const structuredManifest = getStructuredManifest(props.manifest);
  return (
    <div className="rounded-md border bg-card p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ChainIcon chainId={props.chain.chainId} />
          <div className="flex flex-col gap-2">
            <div className="rounded-ful text-sm text-white">
              {props.chain.name} ({props.chain.chainId})
            </div>
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-2">
                <span className="text-xs text-muted-foreground">
                  Start Block /{" "}
                  {structuredManifest.txConfigs
                    .reduce(
                      (acc, txConfig) => {
                        const startBlock =
                          txConfig.startBlock[props.chain.chainId.toString()]!;
                        if (!acc || startBlock < acc) {
                          acc = startBlock;
                        }
                        return acc;
                      },
                      null as number | null,
                    )
                    ?.toString() ?? 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TransactionConfigsSection(props: {
  manifest: Manifest;
  initialChainId?: number;
}) {
  const structuredManifest = getStructuredManifest(props.manifest);
  const [selectedChainId, setSelectedChainId] = useState<string | undefined>(
    props.initialChainId?.toString() ??
      structuredManifest.chains[0]?.chainId.toString(),
  );

  return (
    <div className="mt-2 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground">
            Transaction Configurations
          </div>
          <InfoTooltip text="A transaction is only processed by a configuration if it contains logs that match all the event signatures.">
            <InfoIcon size={14} className="text-muted-foreground" />
          </InfoTooltip>
        </div>
        <Tabs onValueChange={setSelectedChainId} value={selectedChainId}>
          <TabsList className="h-auto rounded-full border">
            {structuredManifest.chains.map((chain) => (
              <TabsTrigger
                key={chain.chainId}
                value={chain.chainId.toString()}
                className="gap-2 rounded-full px-2 text-xs"
              >
                <ChainIcon chainId={chain.chainId} />
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
  const ignoredTxConfigs = structuredManifest.txConfigs.filter(
    (txConfig) =>
      txConfig.chains && !txConfig.chains.includes(Number(selectedChainId)),
  );
  return (
    <div>
      <div className="flex flex-col gap-4">
        {validTxConfigs.map((txConfig) => (
          <TxConfigCard
            key={txConfig.name}
            txConfig={txConfig}
            selectedChainId={
              selectedChainId ? Number(selectedChainId) : undefined
            }
          />
        ))}
        {ignoredTxConfigs.length > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            <div className="text-sm text-muted-foreground">Ignored</div>
            <div className="opacity-50">
              {ignoredTxConfigs.map((txConfig) => (
                <TxConfigCard
                  key={txConfig.name}
                  txConfig={txConfig}
                  selectedChainId={
                    selectedChainId ? Number(selectedChainId) : undefined
                  }
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TxConfigCard(props: {
  txConfig: StructuredManifest["txConfigs"][0];
  selectedChainId: number | undefined;
}) {
  const { txConfig, selectedChainId } = props;

  const getStartBlock = () => {
    if (!selectedChainId) {
      return undefined;
    }

    return txConfig.startBlock[selectedChainId.toString()];
  };

  const startBlock = getStartBlock();

  return (
    <div className="overflow-hidden rounded-md border bg-card">
      <div className="flex items-center justify-between gap-2 bg-black p-4">
        <div className="rounded-ful rounded-full border bg-muted px-2 py-1 text-xs text-white">
          {txConfig.name}
        </div>
        <div className="flex items-center gap-1 rounded-full py-1 pl-2 text-xs">
          <span className="text-muted-foreground">Start Block / </span>
          <Input
            placeholder={new Intl.NumberFormat("en-US").format(startBlock!)}
            className="h-auto w-full max-w-[80px] p-1 text-xs"
          />
        </div>
      </div>
      <Separator />

      <div className="p-4 text-sm">Events</div>
      <Separator />
      <div className="px-4">
        <div className="mt-1 flex flex-col divide-y">
          {txConfig.logConfigs.map((logConfig) => {
            const getAddress = (address: string | Record<string, string>) => {
              if (!selectedChainId) {
                return undefined;
              }

              if (typeof address === "string") {
                return address;
              }

              return address[selectedChainId.toString()];
            };

            return (
              <div className="flex w-auto items-center justify-between py-3 text-xs text-muted-foreground">
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
    </div>
  );
}

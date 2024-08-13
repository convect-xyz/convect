"use client";

import { formatDistanceToNow, millisecondsToMinutes } from "date-fns";
import { times } from "lodash";
import { HelpCircleIcon } from "lucide-react";
import { useState } from "react";
import { CodeBlock } from "~/components/code/CodeBlock";
import { Button } from "~/components/ui/button";
import { ForceRerender } from "~/components/ui/force-rerender";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { RouterOutputs } from "~/trpc/shared";
import { Chain } from "./(components)/Chain";
import InvocationDialog from "./(components)/InvocationDialog";
import ManifestDialog from "./(components)/ManifestDialog";
import TransactionRow from "./(components)/TransactionRow";
import TransactionFilters, { useTransactionFilters } from "./filters";
import { useParams } from "./hooks/useParams";

type Transaction =
  RouterOutputs["functions"]["getTransactions"]["transactions"][0];

const DASHBOARD_REFETCH_INTERVAL = 30000;

const code = (id: string) => `import { log, transaction } from "convect-xyz";

export const handleTransfers = transaction({
  startBlock: BigInt(198160),
  logs: [
    log({
      origin: "0x10fe37bac405b209f83ff523fb8d00c0c3f508a8",
      signature: "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
    }),
  ],
  handler: async (txs) => {
    // Implement your handler
  },
});

export default ingest({
  id: "${id}",
  handlers: [handleTransfers],
});`;

export default function Main() {
  const { chainId, functionId } = useParams();
  const { data: overview } = api.functions.getOverview.useQuery(
    {
      functionId: functionId ?? -1,
      chainId: chainId ?? -1,
    },
    {
      enabled: !!functionId && !!chainId,
      refetchInterval: DASHBOARD_REFETCH_INTERVAL,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      select(data) {
        const mins = millisecondsToMinutes(data.avgDuration);
        const secs = (data.avgDuration / 1000).toFixed(1);

        return {
          ...data,
          avgDurationParsed: {
            mins,
            secs,
          },
          isInitialised: data.version >= 0,
        };
      },
    },
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-stretch gap-2">
          <Chain />
          <VersionStatus />
        </div>
        <LastUpdatedAt />
      </div>
      {overview && !overview.isInitialised && (
        <div className="mt-2 w-full">
          <CodeBlock code={code(overview.internalId)} />
        </div>
      )}

      <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-2">
        {!overview &&
          times(3).map((v) => <Skeleton key={v} className="h-20 bg-muted" />)}

        {overview && overview.isInitialised && (
          <>
            <div className="rounded-md border border-[#191B1F] bg-muted p-4">
              <div className="text-sm uppercase text-muted-foreground">
                Processed Transactions
              </div>
              <div className="text-xl">
                {overview.processedTransactionsCount} /{" "}
                {overview.transactionCount}
              </div>
            </div>
            <div className="rounded-md border border-[#191B1F] bg-muted p-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="uppercase text-muted-foreground">
                  Average DPI
                </span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircleIcon size={14} />
                    </TooltipTrigger>
                    <TooltipContent>
                      Average duration per invocation
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="text-xl">
                {overview && (
                  <>
                    {overview.avgDurationParsed.mins > 0 && (
                      <>{overview.avgDurationParsed.mins}m </>
                    )}
                    {overview.avgDurationParsed.secs}s
                  </>
                )}
              </div>
            </div>
            <div className="rounded-md border border-[#191B1F] bg-muted p-4">
              <div className="text-sm uppercase text-muted-foreground">
                Last Fetched Block
              </div>
              <div className="text-xl">{overview.lastFetchedBlock}</div>
            </div>
          </>
        )}
      </div>
      <div className="mt-2">
        <ManifestSection />
      </div>
      {(!overview || overview.isInitialised) && (
        <div className="mt-2">
          <TransactionFilters>
            <RecentTransactions />
          </TransactionFilters>
        </div>
      )}
    </div>
  );
}

function LastUpdatedAt() {
  const { chainId, functionId } = useParams();
  const { data: overview, dataUpdatedAt } = api.functions.getOverview.useQuery(
    {
      functionId: functionId ?? 0,
      chainId: chainId ?? 0,
    },
    {
      enabled: !!functionId && !!chainId,
    },
  );

  if (!overview) {
    return <Skeleton className="h-6 w-[200px] bg-muted" />;
  }

  return (
    <div className="text-xs text-muted-foreground">
      Last updated{" "}
      <ForceRerender>
        {formatDistanceToNow(dataUpdatedAt, {
          addSuffix: true,
          includeSeconds: true,
        })}
      </ForceRerender>
    </div>
  );
}

function VersionStatus() {
  const { functionId, chainId } = useParams();
  const { data, isLoading } = api.functions.getOverview.useQuery(
    {
      functionId: functionId ?? -1,
      chainId: chainId ?? -1,
    },
    {
      enabled: !!functionId && !!chainId,
    },
  );

  if (isLoading || !data) {
    return <Skeleton className="w-[70px] bg-muted" />;
  }

  if (data.version < 0) return null;

  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted p-1 px-2 text-xs">
      {data?.status === "provisioning" ? (
        <svg
          className="w32 h-3 animate-spin text-white"
          xmlns="http://www.w3.org/2000/svg"
          fill="rgb(31, 41, 55)"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      ) : (
        <div
          className={cn(
            "h-2 w-2 rounded-full",
            data?.status === "processing" && "bg-green-500",
            data?.status === "failed" && "bg-red-500",
          )}
        ></div>
      )}
      <span>V{data!.version}</span>
    </div>
  );
}

function RecentTransactions() {
  const filters = useTransactionFilters();
  const { functionId, chainId } = useParams();
  const [selectedTransactionHash, setSelectedTransactionHash] =
    useState<string>();

  const { data: maybeTransactions, error } =
    api.functions.getTransactions.useQuery(
      {
        functionId: functionId ?? -1,
        chainId: chainId ?? -1,
        search: filters.debouncedSearch,
        status: filters.status,
      },
      {
        refetchInterval: DASHBOARD_REFETCH_INTERVAL,
        enabled: !!chainId && !!functionId,
      },
    );
  console.log("error", error);
  console.log("maybeTransactions", maybeTransactions);

  return (
    <div className="rounded-md border border-[#191B1F] bg-muted p-4">
      <div className="flex items-center gap-2 text-sm">
        <span className="uppercase text-muted-foreground">TRANSACTIONS</span>
      </div>
      <div className="my-2">
        <div className="flex gap-2">
          <Input
            className="flex-1 bg-background"
            placeholder="Search transactions by hash"
            value={filters.search}
            onChange={(e) => filters.setSearch(e.target.value)}
          />
          <StatusFilter />
        </div>
      </div>
      <div className="flex flex-col divide-y">
        {!maybeTransactions &&
          times(25).map((v) => (
            <div className="flex items-center gap-2 py-4" key={v}>
              <Skeleton className="h-2 w-2 rounded-full bg-background" />
              <Skeleton className="h-6 flex-1 bg-background" />
              <Skeleton className="h-6 w-24 bg-background" />
            </div>
          ))}
        {maybeTransactions?.transactions.map((tx) => (
          <TransactionRow
            tx={tx}
            key={tx.id.toString()}
            onRowSelected={(tx) =>
              setSelectedTransactionHash(tx.transactionHash)
            }
          />
        ))}

        {selectedTransactionHash && (
          <InvocationDialog
            open
            onOpenChange={(open) => {
              if (!open) {
                setSelectedTransactionHash(undefined);
              }
            }}
            transactionHash={selectedTransactionHash}
          />
        )}
      </div>
    </div>
  );
}

function StatusFilter() {
  const filters = useTransactionFilters();

  const renderStatusText = (status: typeof filters.status) => {
    if (status === "FAILED") return "Failed";
    if (status === "SUCCESS") return "Success";

    return "All";
  };

  const handleValueChange = (v: string) => {
    switch (v) {
      case "ALL":
        filters.setStatus();
        return;
      case "SUCCESS":
        filters.setStatus("SUCCESS");
        return;
      case "FAILED":
        filters.setStatus("FAILED");
        return;
      default:
        throw new Error("Unsupported status: " + v);
    }
  };

  return (
    <Select value={filters.status ?? "ALL"} onValueChange={handleValueChange}>
      <SelectTrigger className="w-[120px] bg-background">
        <SelectValue placeholder="Status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-gray-800"></div>
            {renderStatusText(undefined)}
          </div>
        </SelectItem>
        <SelectItem value="SUCCESS">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-400"></div>
            {renderStatusText("SUCCESS")}
          </div>
        </SelectItem>
        <SelectItem value="FAILED">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-red-400"></div>
            {renderStatusText("FAILED")}
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

function ManifestSection() {
  const [isOpen, setIsOpen] = useState(false);
  const { functionId, projectId } = useParams();
  const { data: fn } = api.functions.get.useQuery({
    projectId: projectId,
    functionId: functionId,
  });

  if (!fn) {
    return null;
  }

  return (
    <>
      <div className="rounded-md border border-[#191B1F] bg-muted p-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="flex-1 uppercase text-muted-foreground">
            View Manifest
          </span>
          <Button onClick={() => setIsOpen(true)}>View</Button>
        </div>
      </div>
      <ManifestDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        manifest={fn?.currentDeployment?.manifest}
      />
    </>
  );
}

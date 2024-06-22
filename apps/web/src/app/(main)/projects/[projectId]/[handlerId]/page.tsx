"use client";

import {
  formatDistanceToNow,
  millisecondsToMinutes,
  millisecondsToSeconds,
  minutesToMilliseconds,
} from "date-fns";
import { times } from "lodash";
import { HelpCircleIcon } from "lucide-react";
import { CodeBlock } from "~/components/code/CodeBlock";
import ChainIcon from "~/components/icons/ChainIcon";
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
import TransactionFilters, { useTransactionFilters } from "./filters";
import { useParams } from "./hooks/useParams";

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

export default function Page() {
  const { handlerId } = useParams();
  const { data: overview } = api.handlers.getOverview.useQuery(
    {
      handlerId,
    },
    {
      refetchInterval: DASHBOARD_REFETCH_INTERVAL,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      select(data) {
        const mins = millisecondsToMinutes(data.avgDuration);
        const secs = millisecondsToSeconds(
          data.avgDuration - minutesToMilliseconds(mins),
        );

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
        <div className="flex items-center gap-2">
          <VersionStatus />
          <Chain />
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
          times(3).map((v) => <Skeleton className="h-20 bg-muted" />)}

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
                    {overview.avgDurationParsed.mins}m{" "}
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

      {overview && overview.isInitialised && (
        <div className="mt-2">
          <TransactionFilters>
            <RecentTransactions />
          </TransactionFilters>
        </div>
      )}
    </div>
  );
}

const stringToColour = (str: string) => {
  let hash = 0;
  str.split("").forEach((char) => {
    hash = char.charCodeAt(0) + ((hash << 5) - hash);
  });
  let colour = "#";
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    colour += value.toString(16).padStart(2, "0");
  }
  return colour;
};

function LastUpdatedAt() {
  const { handlerId } = useParams();
  const { dataUpdatedAt, isLoading } = api.handlers.getOverview.useQuery({
    handlerId,
  });

  if (isLoading) {
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
  const { handlerId } = useParams();
  const { data, isLoading } = api.handlers.getOverview.useQuery({
    handlerId,
  });

  if (isLoading || !data) {
    return <Skeleton className="h-6 w-[70px] bg-muted" />;
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

function Chain() {
  const { handlerId } = useParams();
  const { data, isLoading } = api.handlers.getOverview.useQuery({
    handlerId,
  });

  if (isLoading) {
    return <Skeleton className="h-6 w-[100px] bg-muted" />;
  }

  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted p-1 px-2 text-xs">
      <ChainIcon chainId={data!.chain.chainId} />
      <span>{data!.chain.name}</span>
    </div>
  );
}

function RecentTransactions() {
  const filters = useTransactionFilters();
  const { handlerId } = useParams();

  const { data: maybeTransactions } = api.handlers.getTransactions.useQuery(
    {
      handlerId,
      search: filters.debouncedSearch,
      status: filters.status,
    },
    {
      refetchInterval: DASHBOARD_REFETCH_INTERVAL,
    },
  );

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
        {maybeTransactions &&
          maybeTransactions.transactions.map((tx) => (
            <div
              className="flex items-center gap-2 py-4"
              key={tx.id.toString()}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  tx.status === "SUCCESS" && "bg-green-400",
                  tx.status === "FAILED" && "bg-red-400",
                )}
              ></span>
              <div className="flex-1">{tx.transactionHash}</div>
              <div className="text-sm text-muted-foreground">
                <ForceRerender>
                  {formatDistanceToNow(tx.timestamp, { addSuffix: true })}
                </ForceRerender>
              </div>
            </div>
          ))}
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

"use client";

import {
  formatDistanceToNow,
  millisecondsToMinutes,
  millisecondsToSeconds,
  minutesToMilliseconds,
} from "date-fns";
import { times } from "lodash";
import { HelpCircleIcon } from "lucide-react";
import { ForceRerender } from "~/components/ui/force-rerender";
import { Input } from "~/components/ui/input";
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

export default function Page() {
  const { handlerId } = useParams();
  const { data: overview } = api.handlers.getOverview.useQuery(
    {
      handlerId,
    },
    {
      refetchInterval: DASHBOARD_REFETCH_INTERVAL,
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
        };
      },
    },
  );

  return (
    <div>
      <LastUpdatedAt />
      <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-2">
        {!overview &&
          times(4).map((v) => <Skeleton className="h-20 bg-muted" />)}
        {overview && (
          <>
            <div className="rounded-md border border-[#191B1F] bg-muted p-4">
              <div className="text-sm uppercase text-muted-foreground">
                Processed Transactions
              </div>
              <div className="text-xl">
                {overview?.processedTransactionsCount} /{" "}
                {overview?.transactionCount}
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
              <div className="text-xl">{overview?.lastFetchedBlock}</div>
            </div>
          </>
        )}
      </div>
      <div className="mt-4">
        <TransactionFilters>
          <RecentTransactions />
        </TransactionFilters>
      </div>
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
    return <Skeleton className="h-4 w-[100px] bg-muted" />;
  }

  return (
    <div className="text-sm text-muted-foreground">
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

function RecentTransactions() {
  const filters = useTransactionFilters();
  const { handlerId } = useParams();

  const { data: maybeTransactions } = api.handlers.getTransactions.useQuery(
    {
      handlerId,
      search: filters.debouncedSearch,
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
        {!maybeTransactions ? (
          <Skeleton className="h-8 bg-background" />
        ) : (
          <Input
            className="bg-background"
            placeholder="Search transactions by hash"
            value={filters.search}
            onChange={(e) => filters.setSearch(e.target.value)}
          />
        )}
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
            <div className="flex items-center gap-2 py-4" key={tx.timestamp}>
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

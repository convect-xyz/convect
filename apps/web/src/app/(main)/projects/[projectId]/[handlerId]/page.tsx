"use client";

import {
  formatDistanceToNow,
  millisecondsToMinutes,
  millisecondsToSeconds,
  minutesToMilliseconds,
} from "date-fns";
import { HelpCircleIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useParams } from "./hooks/useParams";

export default function Page() {
  const { handlerId } = useParams();
  const { data: overview } = api.handlers.getOverview.useQuery(
    {
      handlerId,
    },
    {
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
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-2">
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
            <span className="uppercase text-muted-foreground">Average DPI</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircleIcon size={14} />
                </TooltipTrigger>
                <TooltipContent>Average duration per invocation</TooltipContent>
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
      </div>
      <div className="mt-4">
        <RecentTransactions />
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

function RecentTransactions() {
  const { handlerId } = useParams();
  const { data: overview } = api.handlers.getOverview.useQuery({
    handlerId,
  });

  return (
    <div className="rounded-md border border-[#191B1F] bg-muted p-4">
      <div className="flex items-center gap-2 text-sm">
        <span className="uppercase text-muted-foreground">
          Recently Processed
        </span>
      </div>
      <div className="flex flex-col divide-y">
        {overview &&
          overview.recentTransactions.map((tx) => (
            <div
              className="flex items-center gap-2 py-4"
              key={tx.transactionHash}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  tx.status === "SUCCESS" && "bg-green-400",
                  tx.status === "FAILURE" && "bg-red-400",
                )}
              ></span>
              <div className="flex-1">{tx.transactionHash}</div>
              <div className="text-sm text-muted-foreground">
                {formatDistanceToNow(tx.timestamp, { addSuffix: true })}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

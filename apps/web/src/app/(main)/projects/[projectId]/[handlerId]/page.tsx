"use client";

import {
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
import { api } from "~/trpc/react";
import { useParams } from "./hooks/useParams";

export default function Page() {
  const { handlerId } = useParams();
  const { data: overview } = api.handlers.getOverview.useQuery(
    {
      handlerId,
    },
    {
      refetchInterval: 5000,
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
    <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-2">
      <div className="rounded-md border border-[#191B1F] bg-muted p-4">
        <div className="text-sm uppercase text-muted-foreground">
          Processed Transactions
        </div>
        <div className="text-xl">
          {overview?.processedTransactionsCount} / {overview?.transactionCount}
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
    </div>
  );
}

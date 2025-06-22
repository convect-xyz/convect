"use client";

import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { cn } from "~/lib/utils";
import { useFilters } from "../filtersContext";

export function TimestampRangeFilter() {
  const filters = useFilters();

  return (
    <div className="grid gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "justify-start text-left text-xs font-normal",
              !filters.timeRange && "text-muted-foreground",
            )}
          >
            <CalendarIcon strokeWidth={1} size={14} />
            {filters.timeRange?.from ? (
              filters.timeRange.to ? (
                <>
                  {format(filters.timeRange.from, "LLL dd, y")} -{" "}
                  {format(filters.timeRange.to, "LLL dd, y")}
                </>
              ) : (
                format(filters.timeRange.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={filters.timeRange?.from}
            selected={filters.timeRange}
            onSelect={filters.setTimeRange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

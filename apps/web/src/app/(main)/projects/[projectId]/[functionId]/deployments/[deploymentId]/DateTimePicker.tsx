"use client";

import { millisecondsToSeconds } from "date-fns";
import { PropsWithChildren, useState } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { ScrollArea, ScrollBar } from "~/components/ui/scroll-area";
import { api } from "~/trpc/react";

export function DateTimePicker(
  props: PropsWithChildren<{
    chainId: number;
    onBlockNumberChanged: (blockNumber: number) => void;
  }>,
) {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [open, setOpen] = useState(false);
  const { mutateAsync: getBlockNumber, isPending: isLoadingBlockNumber } =
    api.blocks.getBlockByTimestamp.useMutation();

  async function handleGetBlockNumber() {
    if (!selectedDate) {
      return;
    }

    const { blockNumber } = await getBlockNumber({
      chainId: props.chainId,
      timestampSecs: millisecondsToSeconds(selectedDate.getTime()),
    });

    props.onBlockNumberChanged(blockNumber);

    toast(
      `Nearest block number to ${selectedDate.toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      })} is ${blockNumber}`,
    );
    setOpen(false);
    setSelectedDate(undefined);
  }

  function handleDateSelect(date: Date | undefined) {
    if (date) {
      setSelectedDate(date);
    }
  }

  function handleTimeChange(type: "hour" | "minute", value: string) {
    const currentDate = selectedDate || new Date();
    let newDate = new Date(currentDate);

    if (type === "hour") {
      const hour = parseInt(value, 10);
      newDate.setHours(hour);
    } else if (type === "minute") {
      newDate.setMinutes(parseInt(value, 10));
    }

    setSelectedDate(newDate);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{props.children}</PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <div className="p-4">
          <div className="font-semibold">Get block number by date</div>
          <div className="text-xs text-muted-foreground">
            This utility will get the nearest block number after the given date.
          </div>
        </div>
        <div className="sm:flex">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            disabled={(date) => date > new Date()}
            initialFocus
          />
          <div className="flex flex-col divide-y sm:h-[300px] sm:flex-row sm:divide-x sm:divide-y-0">
            <ScrollArea className="w-64 sm:w-auto">
              <div className="flex px-2 sm:flex-col">
                {Array.from({ length: 24 }, (_, i) => i)
                  .reverse()
                  .map((hour) => (
                    <Button
                      key={hour}
                      size="icon"
                      variant={
                        selectedDate && selectedDate.getHours() === hour
                          ? "default"
                          : "ghost"
                      }
                      className="aspect-square shrink-0 sm:w-full"
                      onClick={() => handleTimeChange("hour", hour.toString())}
                    >
                      {hour}
                    </Button>
                  ))}
              </div>
              <ScrollBar orientation="horizontal" className="sm:hidden" />
            </ScrollArea>
            <ScrollArea className="w-64 sm:w-auto">
              <div className="flex px-2 sm:flex-col">
                {Array.from({ length: 60 }, (_, i) => i * 1).map((minute) => (
                  <Button
                    key={minute}
                    size="icon"
                    variant={
                      selectedDate && selectedDate.getMinutes() === minute
                        ? "default"
                        : "ghost"
                    }
                    className="aspect-square shrink-0 sm:w-full"
                    onClick={() =>
                      handleTimeChange("minute", minute.toString())
                    }
                  >
                    {minute.toString().padStart(2, "0")}
                  </Button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" className="sm:hidden" />
            </ScrollArea>
          </div>
        </div>
        <div className="flex items-center justify-between p-4">
          <Button
            size="sm"
            onClick={handleGetBlockNumber}
            isLoading={isLoadingBlockNumber}
            disabled={!selectedDate}
          >
            Get Block Number
          </Button>
          <div className="text-xs text-muted-foreground">
            {selectedDate?.toLocaleString("en-US", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

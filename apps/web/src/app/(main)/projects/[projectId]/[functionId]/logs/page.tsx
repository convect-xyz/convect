"use client";

import { DialogProps } from "@radix-ui/react-dialog";
import { times } from "lodash";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { Skeleton } from "~/components/ui/skeleton";
import { RouterOutputs } from "~/trpc/shared";
import { Filters } from "./Filters";
import LogFilters from "./filtersContext";
import { useLogs } from "./hooks/useLogs";

type LogRow = RouterOutputs["functions"]["getLogs"][0];

export default function Page() {
  return (
    <LogFilters>
      <div className="max-w-[100vw] overflow-hidden">
        <div className="flex divide-x">
          <div className="sticky top-[100px] h-[calc(100vh-100px)] basis-1/6 overflow-y-auto bg-black">
            <Filters />
          </div>
          <div className="min-h-[calc(100vh-100px)] min-w-0 flex-1">
            <Content />
          </div>
        </div>
      </div>
    </LogFilters>
  );
}

function Content() {
  return (
    <div className="flex flex-col gap-2 overflow-hidden">
      <LogsTable />
    </div>
  );
}

function LogsTable() {
  const [selectedLog, setSelectedLog] = useState<LogRow>();
  const { data: logs } = useLogs();

  return (
    <>
      <div className="w-full border-spacing-x-2">
        <div className="flex gap-2 bg-muted px-4 py-2 text-sm text-muted-foreground">
          <div className="basis-36">ID</div>
          <div className="basis-56">Timestamp</div>
          <div className="basis-16">Level</div>
          <div className="min-w-9 flex-0">Message</div>
        </div>

        {logs?.length === 0 && (
          <div className="align-center flex justify-center p-12">
            Nothing to see here
          </div>
        )}

        <div className="flex flex-col divide-y">
          {!logs &&
            times(20).map((v) => (
              <div key={v} className="p-4 py-5 text-sm">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 basis-36" />
                  <Skeleton className="h-4 basis-56" />
                  <Skeleton className="h-4 basis-14" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              </div>
            ))}
          {logs?.map((row) => (
            <div
              key={row.time + row.log_level}
              className="flex items-center gap-2 px-4 py-2 text-xs hover:bg-muted"
              onClick={() => setSelectedLog(row)}
            >
              <div className="basis-36 truncate">{row.invocation_id}</div>
              <div className="basis-56 truncate">{row.time}</div>
              <div className="basis-16 truncate">{row.log_level}</div>
              <div className="min-w-0 flex-1 truncate">{row.log_message}</div>
            </div>
          ))}
        </div>
      </div>

      {selectedLog && (
        <LogsDetail
          open
          onOpenChange={() => setSelectedLog(undefined)}
          log={selectedLog}
        />
      )}
    </>
  );
}

type LogsDetailProps = {
  log: LogRow;
};

function LogsDetail(props: LogsDetailProps & DialogProps) {
  const { log, ...rest } = props;
  return (
    <Sheet {...rest}>
      <SheetContent className="w-[400px] sm:max-w-[700px]">
        <SheetHeader>
          <SheetTitle>Log</SheetTitle>
        </SheetHeader>
        <div className="max-h-[500px] overflow-y-auto rounded-sm border p-1">
          <code className="break-all text-xs">{log.log_message}</code>
        </div>
      </SheetContent>
    </Sheet>
  );
}

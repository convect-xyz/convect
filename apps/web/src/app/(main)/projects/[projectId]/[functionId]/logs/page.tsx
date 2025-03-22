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
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { RouterOutputs } from "~/trpc/shared";
import { ActiveDeployments } from "../(components)/ActiveDeployments";
import { Chain } from "../(components)/Chain";
import LogFilters, { useFilters } from "./filters";
import { useLogs } from "./hooks/useLogs";

type LogRow = RouterOutputs["functions"]["getLogs"][0];

export default function Page() {
  return (
    <div className="mx-auto max-w-screen-lg">
      <LogFilters>
        <Content />
      </LogFilters>
    </div>
  );
}

function Content() {
  const { logLevel, setLogLevel } = useFilters();

  return (
    <div className="flex flex-col gap-2 overflow-hidden p-1">
      <div className="flex items-stretch justify-between gap-2">
        <ActiveDeployments />
        <div className="flex h-full items-center gap-2">
          <Chain />
          <Tabs value={logLevel}>
            <TabsList className="h-auto border bg-muted">
              <TabsTrigger value="INFO" onClick={() => setLogLevel("INFO")}>
                Info
              </TabsTrigger>
              <TabsTrigger value="ERROR" onClick={() => setLogLevel("ERROR")}>
                Error
              </TabsTrigger>
              <TabsTrigger value="DEBUG" onClick={() => setLogLevel("DEBUG")}>
                Debug
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      <div className="overflow-hidden rounded-md border">
        <LogsTable />
      </div>
    </div>
  );
}

function LogsTable() {
  const [selectedLog, setSelectedLog] = useState<LogRow>();
  const { data: logs } = useLogs();
  console.log(logs);
  return (
    <>
      <div className="w-full border-spacing-x-2">
        <div className="flex gap-2 bg-muted p-4 text-muted-foreground">
          <div className="basis-36">ID</div>
          <div className="basis-56">Timestamp</div>
          <div className="basis-16">Level</div>
          <div className="flex-1">Message</div>
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
              className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted"
              onClick={() => setSelectedLog(row)}
            >
              <div className="basis-36 truncate">{row.invocation_id}</div>
              <div className="basis-56 truncate">{row.time}</div>
              <div className="basis-16 truncate">{row.log_level}</div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="min-w-0 truncate">{row.log_message}</div>
              </div>
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

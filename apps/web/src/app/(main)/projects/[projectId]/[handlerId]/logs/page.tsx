"use client";

import { DialogProps } from "@radix-ui/react-dialog";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { RouterOutputs } from "~/trpc/shared";
import { columns } from "./columns";
import LogFilters, { useFilters } from "./filters";
import { useLogs } from "./hooks/useLogs";

type LogRow = RouterOutputs["handlers"]["getLogs"][0];

export default function Page() {
  return (
    <LogFilters>
      <Content />
    </LogFilters>
  );
}

function Content() {
  const { data } = useLogs();
  const { logLevel, setLogLevel } = useFilters();
  return (
    <div className="flex flex-col gap-2 overflow-hidden">
      <Tabs value={logLevel} className="self-end">
        <TabsList className="bg-muted">
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
      <div className="overflow-hidden rounded-md border">
        {data && <LogsTable />}
      </div>
    </div>
  );
}

function LogsTable() {
  const { data: logs } = useLogs();
  const [selectedLog, setSelectedLog] = useState<LogRow>();

  const table = useReactTable({
    data: logs!,
    columns,
    getCoreRowModel: getCoreRowModel(),
    defaultColumn: {
      minSize: 0,
      size: Number.MAX_SAFE_INTEGER,
      maxSize: Number.MAX_SAFE_INTEGER,
    },
  });

  return (
    <>
      <div className="w-full border-spacing-x-2">
        <div className="flex gap-2 bg-muted p-4 text-muted-foreground">
          <div className="basis-36">ID</div>
          <div className="basis-56">Timestamp</div>
          <div className="basis-16">Level</div>
          <div className="flex-1">Message</div>
        </div>
        {logs!.length === 0 && (
          <div className="align-center flex justify-center p-12">
            Nothing to see here
          </div>
        )}
        <div className="flex flex-col divide-y">
          {table.getRowModel().rows.map((row) => (
            <div
              key={row.id}
              className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted"
              onClick={() => setSelectedLog(row.original)}
            >
              <div className="basis-36 truncate">
                {row.renderValue("invocation_id")}
              </div>
              <div className="basis-56 truncate">{row.renderValue("time")}</div>
              <div className="basis-16 truncate">
                {row.renderValue("log_level")}
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="min-w-0 truncate">
                  {row.renderValue("log_message")}
                </div>
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
  log: RouterOutputs["handlers"]["getLogs"][0];
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

"use client";

import { DialogProps } from "@radix-ui/react-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { RouterOutputs } from "~/trpc/shared";
import { Chain } from "../(components)/Chain";
import { useDeployments } from "./hooks/useDeployments";

type LogRow = RouterOutputs["handlers"]["getLogs"][0];

export default function Page() {
  return <Content />;
}

function Content() {
  const { data } = useDeployments();

  return (
    <div className="flex flex-col gap-2 overflow-hidden p-1">
      <div className="flex items-stretch gap-2">
        <Chain />
      </div>
      <div className="overflow-hidden rounded-md border">
        {data && <DeploymentsTable />}
      </div>
    </div>
  );
}

function DeploymentsTable() {
  const { data: deployments } = useDeployments();

  return (
    <>
      <div className="w-full border-spacing-x-2">
        {deployments!.length === 0 && (
          <div className="align-center flex justify-center p-12">
            Nothing to see here
          </div>
        )}
        <div className="flex flex-col divide-y">
          {deployments?.map((deployment) => (
            <div
              key={deployment.id}
              className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted"
            >
              <div className="basis-36 truncate">{deployment.id}</div>
              <div className="basis-56 truncate">
                {new Date(deployment.createdAt).toLocaleString()}
              </div>
              <div className="basis-16 truncate">{deployment.status}</div>
            </div>
          ))}
        </div>
      </div>
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

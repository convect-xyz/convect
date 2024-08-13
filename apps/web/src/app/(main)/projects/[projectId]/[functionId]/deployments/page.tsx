"use client";

import { DialogProps } from "@radix-ui/react-dialog";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { Manifest } from "~/lib/shared/manifest";
import { RouterOutputs } from "~/trpc/shared";
import ManifestDialog from "../(components)/ManifestDialog";
import { useDeployments } from "./hooks/useDeployments";

type LogRow = RouterOutputs["functions"]["getLogs"][0];

export default function Page() {
  return <Content />;
}

function Content() {
  const { data } = useDeployments();

  return (
    <div className="flex flex-col gap-2 overflow-hidden p-1">
      <div className="overflow-hidden rounded-md border">
        {data && <DeploymentsTable />}
      </div>
    </div>
  );
}

function DeploymentsTable() {
  const { data: deployments } = useDeployments();
  const [currentManifest, setCurrentManifest] = useState<Manifest>();

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
            <div key={deployment.id} className=" bg-muted p-4  text-sm">
              <div className="flex items-center gap-2">
                <div className="flex flex-1 items-center gap-2">
                  <div className="basis-96 truncate">{deployment.id}</div>
                  <div className="basis-56 truncate">{deployment.status}</div>
                </div>
                <div className="truncate">
                  {formatDistanceToNow(deployment.createdAt, {
                    addSuffix: true,
                  })}
                </div>
              </div>
              <Button onClick={() => setCurrentManifest(deployment.manifest)}>
                View Manifest
              </Button>
            </div>
          ))}
        </div>
      </div>
      {currentManifest && (
        <ManifestDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setCurrentManifest(undefined);
            }
          }}
          manifest={currentManifest}
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

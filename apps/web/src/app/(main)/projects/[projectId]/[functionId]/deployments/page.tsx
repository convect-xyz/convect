"use client";

import { Manifest } from "@convect-xyz/lib";
import { formatDistanceToNow } from "date-fns";
import { capitalize, times } from "lodash";
import { LoaderIcon, MoreHorizontalIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Skeleton } from "~/components/ui/skeleton";
import { RouterOutputs } from "~/trpc/shared";
import ManifestDialog from "../(components)/ManifestDialog";
import { useDeployments } from "./hooks/useDeployments";
import { useRunningLabel } from "./hooks/useRunningLabel";

type Deployment = RouterOutputs["functions"]["getDeployments"][0];

export default function Page() {
  return <Content />;
}

function Content() {
  return (
    <div className="flex flex-col gap-2 overflow-hidden p-1">
      <div className="overflow-hidden rounded-md border">
        <DeploymentsTable />
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
        {deployments?.length === 0 && (
          <div className="align-center flex justify-center p-12">
            Nothing to see here
          </div>
        )}
        <div className="flex flex-col divide-y">
          {!deployments &&
            times(20).map((v) => (
              <div key={v} className="p-4 py-5 text-sm">
                <div className="flex items-center gap-2">
                  <div className="flex flex-1 items-center gap-2">
                    <Skeleton className="h-6 basis-96" />
                    <Skeleton className="h-2 w-2" />
                    <Skeleton className="h-6 basis-24" />
                  </div>
                  <Skeleton className="h-6 w-24" />
                </div>
              </div>
            ))}
          {deployments?.map((deployment) => (
            <div key={deployment.id} className=" p-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="flex flex-1 items-center gap-2">
                  <div className="bg-chip mr-4 basis-[70px] truncate rounded-full border px-2 text-center">
                    {deployment.id.slice(0, 6)}
                  </div>
                  <RenderStatusIcon status={deployment.status} />
                  <div className="flex-1 truncate">
                    {capitalize(deployment.status)}
                    <div className="mt-1 text-xs text-muted-foreground">
                      <RunningLabel
                        runningAt={deployment.runningAt}
                        finishedAt={deployment.finishedAt}
                      />
                    </div>
                  </div>
                </div>
                <div className="truncate">
                  {formatDistanceToNow(deployment.createdAt, {
                    addSuffix: true,
                  })}
                </div>
                <div>
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <Button variant="ghost">
                        <MoreHorizontalIcon size={14} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() => setCurrentManifest(deployment.manifest)}
                      >
                        View Manifest
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
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

function RunningLabel(props: {
  runningAt?: number | null;
  finishedAt?: number | null;
}) {
  return useRunningLabel(props.runningAt, props.finishedAt) ?? "-";
}

function RenderStatusIcon(props: { status: Deployment["status"] }) {
  switch (props.status) {
    case "PENDING":
      return (
        <LoaderIcon className="h-2 w-2 animate-spin text-muted-foreground" />
      );
    case "RUNNING":
      return <div className="h-2 w-2 rounded-full bg-amber-400"></div>;
    case "SUCCESS":
      return <div className="h-2 w-2 rounded-full bg-green-400"></div>;
    case "FAILED":
      return <div className="h-2 w-2 rounded-full bg-red-400"></div>;
  }
}

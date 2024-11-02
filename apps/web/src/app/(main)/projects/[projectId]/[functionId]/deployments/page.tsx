"use client";

import { Manifest } from "@convect-xyz/lib";
import { formatDistanceToNow } from "date-fns";
import { capitalize } from "lodash";
import { LoaderIcon, MoreHorizontalIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { RouterOutputs } from "~/trpc/shared";
import ManifestDialog from "../(components)/ManifestDialog";
import { useDeployments } from "./hooks/useDeployments";

type Deployment = RouterOutputs["functions"]["getDeployments"][0];

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
                  <RenderStatusIcon status={deployment.status} />
                  <div className="basis-56 truncate">
                    {capitalize(deployment.status)}
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

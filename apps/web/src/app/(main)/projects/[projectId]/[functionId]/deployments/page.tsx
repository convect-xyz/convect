"use client";

import { Manifest } from "@convect-xyz/lib";
import { formatDistanceToNow } from "date-fns";
import { capitalize, times } from "lodash";
import { ChevronRightIcon, LoaderIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useInView } from "react-intersection-observer";
import { Skeleton } from "~/components/ui/skeleton";
import { RouterOutputs } from "~/trpc/shared";
import ManifestDialog from "../(components)/ManifestDialog";
import { useDeployments } from "./hooks/useDeployments";
import { useRunningLabel } from "./hooks/useRunningLabel";

type Deployment =
  RouterOutputs["functions"]["getDeployments"]["deployments"][0];

export default function Page() {
  return <Content />;
}

function Content() {
  return (
    <div>
      <Header />
      <div>
        <div className="mx-auto mt-8 flex max-w-screen-md flex-col gap-2 overflow-hidden">
          <div className="overflow-hidden rounded-md border">
            <DeploymentsTable />
          </div>
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="border-b bg-black py-10">
      <div className="mx-auto w-full max-w-screen-md">
        <div className="flex items-center justify-between">
          <div className="text-3xl">Deployments</div>
        </div>
      </div>
    </div>
  );
}

function DeploymentsTable() {
  const { ref, inView } = useInView();
  const {
    data: deploymentPages,
    isFetchingNextPage,
    fetchNextPage,
  } = useDeployments();
  const [currentManifest, setCurrentManifest] = useState<Manifest>();

  const deployments = deploymentPages?.pages?.flatMap(
    (page) => page.deployments,
  );

  useEffect(() => {
    if (inView && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, isFetchingNextPage, fetchNextPage]);
  return (
    <>
      <div className="w-full border-spacing-x-2">
        {deployments?.length === 0 && (
          <div className="align-center flex justify-center p-12">
            Nothing to see here
          </div>
        )}
        <div className="flex flex-col divide-y">
          {deployments?.map((deployment) => (
            <Link
              key={deployment.id}
              href={`deployments/${deployment.id}`}
              className="p-4 text-sm"
            >
              <div className="text-sm">
                <div className="flex items-center gap-2">
                  <div className="flex flex-1 items-center gap-2">
                    <div className="mr-4 basis-[70px] truncate rounded-full border bg-chip px-2 text-center">
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
                  <div className="truncate text-xs">
                    {formatDistanceToNow(deployment.createdAt, {
                      addSuffix: true,
                    })}
                  </div>
                  <div>
                    <ChevronRightIcon
                      className="text-muted-foreground opacity-40"
                      size={20}
                    />
                  </div>
                </div>
              </div>
            </Link>
          ))}

          {(!deployments || isFetchingNextPage) &&
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

          {deployments && deployments.length > 0 && <div ref={ref}></div>}
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

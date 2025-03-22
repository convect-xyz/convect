"use client";

import { times } from "lodash";
import { HelpCircleIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useInView } from "react-intersection-observer";
import InfoTooltip from "~/components/core/InfoTooltip";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import BatchRow from "./(components)/BatchRow";
import ManifestDialog from "./(components)/ManifestDialog";
import { useBatches } from "./hooks/useBatches";
import { useOverview } from "./hooks/useOverview";
import { useParams } from "./hooks/useParams";

export default function Main() {
  const [batchId, setBatchId] = useState<string>();

  return (
    <div className="mx-auto max-w-screen-lg py-4">
      <div>
        <Overview />
        <RecentBatches batchId={batchId} setBatchId={setBatchId} />
      </div>
    </div>
  );
}

function Overview() {
  const { data: overview } = useOverview();

  return (
    <div className="mt-2 grid w-full grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-2 px-4">
      {!overview && times(3).map((v) => <Skeleton key={v} className="h-20" />)}

      {overview && (
        <>
          <div className="rounded-md border border-[#191B1F] bg-muted p-4">
            <div className="text-xs uppercase text-muted-foreground">
              Total Transactions
            </div>
            <div className="text-xl">
              {overview.processedTransactionsCount} /{" "}
              {overview.transactionCount}
            </div>
          </div>
          <div className="rounded-md border border-[#191B1F] bg-muted p-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="uppercase text-muted-foreground">
                Average DPI
              </span>
              <InfoTooltip text="Average duration per invocation">
                <HelpCircleIcon size={14} />
              </InfoTooltip>
            </div>
            <div className="text-xl">
              {overview && (
                <>
                  {overview.avgDurationParsed.mins > 0 && (
                    <>{overview.avgDurationParsed.mins}m </>
                  )}
                  {overview.avgDurationParsed.secs}s
                </>
              )}
            </div>
          </div>
          <div className="rounded-md border border-[#191B1F] bg-muted p-4">
            <div className="text-xs uppercase text-muted-foreground">
              Last Fetched Block
            </div>
            <div className="text-xl">{overview.lastFetchedBlock}</div>
          </div>
        </>
      )}
    </div>
  );
}
function RecentBatches(props: {
  batchId?: string;
  setBatchId: (v: string) => void;
}) {
  const { ref: scrollRef, inView } = useInView();
  const {
    data: maybeBatchesPages,
    fetchNextPage,
    isFetchingNextPage,
  } = useBatches();
  const maybeBatches = maybeBatchesPages?.pages.flatMap((p) => p.batches);

  useEffect(() => {
    if (inView && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="mt-4 px-4">
      <div>Recent Batches</div>
      <div className="my-2 flex flex-col divide-y rounded-md border">
        {maybeBatches?.map((batch, idx) => (
          <BatchRow
            batch={batch}
            key={batch.id}
            onRowSelected={(batch) => props.setBatchId(batch.batchId)}
          />
        ))}

        {(!maybeBatches || isFetchingNextPage) &&
          times(25).map((v) => (
            <div className="flex items-center gap-2 p-4" key={v}>
              <Skeleton className="h-2 w-2 rounded-full" />
              <Skeleton className="h-6 flex-1" />
              <Skeleton className="h-6 w-24" />
            </div>
          ))}
        {maybeBatches?.length === 0 && (
          <div className="py-10 text-center">
            <p>No batches processed</p>
          </div>
        )}
      </div>
      {maybeBatches?.length !== 0 && <div ref={scrollRef} />}
    </div>
  );
}

function ManifestSection() {
  const [isOpen, setIsOpen] = useState(false);
  const { chainId } = useParams();
  const { data: overview } = useOverview();

  if (!overview) {
    return null;
  }

  return (
    <>
      <Button variant="outline" onClick={() => setIsOpen(true)}>
        View Manifest
      </Button>
      <ManifestDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        initialChainId={chainId ?? undefined}
        manifest={overview.manifest}
      />
    </>
  );
}

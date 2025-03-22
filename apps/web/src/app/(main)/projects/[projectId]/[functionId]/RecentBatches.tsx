"use client";

import { times } from "lodash";
import { useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { Skeleton } from "~/components/ui/skeleton";
import BatchRow from "./(components)/BatchRow";
import { useBatches } from "./hooks/useBatches";

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
    <div>
      <div className="my-2 flex flex-col divide-y rounded-md">
        {maybeBatches?.map((batch, idx) => (
          <BatchRow
            batch={batch}
            key={batch.id}
            onRowSelected={(batch) => props.setBatchId(batch.batchId)}
          />
        ))}

        {(!maybeBatches || isFetchingNextPage) &&
          times(25).map((v) => (
            <div className="flex items-center gap-2 py-4" key={v}>
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

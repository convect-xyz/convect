"use client";

import { api } from "~/trpc/react";
import { useParams } from "./hooks/useParams";

export default function Page() {
  const { handlerId } = useParams();
  const { data: overview } = api.handlers.getOverview.useQuery({
    handlerId,
  });

  console.log(overview);
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
      <div className="rounded-md border bg-background p-4">
        <div className="text-sm uppercase text-secondary">
          Fetched Transactions
        </div>
        <div className="text-xl">
          {overview?.processedTransactionsCount} / {overview?.transactionCount}
        </div>
      </div>
    </div>
  );
}

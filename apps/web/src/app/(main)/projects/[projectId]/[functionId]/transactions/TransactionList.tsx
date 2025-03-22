"use client";

import { times } from "lodash";
import { useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import TransactionRow from "../(components)/TransactionRow";
import { useTransactionFilters } from "../filters";
import { useTransactions } from "../hooks/useTransactions";

export function TransactionSearch() {
  const filters = useTransactionFilters();
  return (
    <Input
      className="flex-1 bg-background"
      placeholder="Search transactions by hash"
      value={filters.search}
      onChange={(e) => filters.setSearch(e.target.value)}
    />
  );
}

export function TransactionList(props: {
  transactionId?: string;
  setTransactionId: (v: string) => void;
}) {
  const { ref: scrollRef, inView } = useInView();

  const {
    data: maybeTransactionsPages,
    fetchNextPage,
    isFetchingNextPage,
  } = useTransactions();
  const maybeTransactions = maybeTransactionsPages?.pages.flatMap(
    (p) => p.transactions,
  );

  useEffect(() => {
    if (inView && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-2">
        <TransactionSearch />
      </div>
      <div className="flex h-full flex-1 flex-col items-stretch divide-y overflow-y-auto rounded-md">
        {maybeTransactions?.map((tx, idx) => (
          <TransactionRow
            tx={tx}
            key={tx.id}
            onRowSelected={(tx) => props?.setTransactionId(tx.transactionHash)}
          />
        ))}

        {(!maybeTransactions || isFetchingNextPage) &&
          times(25).map((v) => (
            <div className="flex flex-col items-stretch gap-2 p-4" key={v}>
              <Skeleton className="h-4 w-full" />
              <div className="flex justify-between">
                <Skeleton className="h-4 w-16 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          ))}
      </div>
      {maybeTransactions?.length === 0 && (
        <div className="py-10 text-center">
          <p>No transactions processed</p>
        </div>
      )}

      {maybeTransactions?.length !== 0 && <div ref={scrollRef} />}
    </div>
  );
}

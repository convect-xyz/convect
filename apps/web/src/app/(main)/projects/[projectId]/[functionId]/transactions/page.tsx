"use client";

import { useState } from "react";
import TransactionFilters from "../filters";
import { Filters } from "./Filters";
import { TransactionDetail } from "./TransactionDetail";
import { TransactionList } from "./TransactionList";

export default function Page() {
  const [transactionId, setTransactionId] = useState<string>();

  return (
    <TransactionFilters>
      <div className="flex divide-x">
        <div className="sticky top-[100px] h-[calc(100vh-100px)] basis-1/6 overflow-y-auto">
          <Filters />
        </div>
        <div className="sticky top-[100px] h-[calc(100vh-100px)] shrink-[1] grow-0 basis-2/6 overflow-hidden">
          <TransactionList
            transactionId={transactionId}
            setTransactionId={setTransactionId}
          />
        </div>
        <div className="flex-1">
          <TransactionDetail transactionHash={transactionId} />
        </div>
      </div>
    </TransactionFilters>
  );
}

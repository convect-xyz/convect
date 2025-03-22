"use client";

import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { ActiveDeployments } from "../(components)/ActiveDeployments";
import { ChainFull } from "../(components)/ChainFull";
import { HandlerFilter } from "../(components)/HandlerFilter";
import TransactionFilters from "../filters";
import { TransactionDetail } from "./TransactionDetail";
import { TransactionList } from "./TransactionList";

export default function Page() {
  const [transactionId, setTransactionId] = useState<string>();

  return (
    <TransactionFilters>
      <div className="flex divide-x">
        <div className="sticky top-[100px] h-full basis-1/6 overflow-y-auto">
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

function Filters() {
  const filters = {
    deployment: "deployment",
    chain: "chain",
    handler: "handler",
  };

  return (
    <div className="px-5 pt-3">
      <div className="font-semibold">Filters</div>

      <div className="mt-4">
        <Accordion
          defaultValue={[filters.deployment, filters.chain]}
          type="multiple"
        >
          <AccordionItem value={filters.deployment}>
            <AccordionTrigger className="w-full">Deployment</AccordionTrigger>
            <AccordionContent>
              <ActiveDeployments />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value={filters.chain}>
            <AccordionTrigger className="w-full">Chain</AccordionTrigger>
            <AccordionContent>
              <ChainFull />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value={filters.handler}>
            <AccordionTrigger className="w-full">Handlers</AccordionTrigger>
            <AccordionContent>
              <HandlerFilter />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}

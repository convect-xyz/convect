"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { ActiveDeployments } from "../(components)/ActiveDeployments.js";
import { ChainFull } from "../(components)/ChainFull.js";
import { HandlerFilter } from "../(components)/HandlerFilter.js";

export function Filters() {
  const filters = {
    chain: "chain",
    level: "level",
  };

  return (
    <div className="px-5 pt-3">
      <div className="font-semibold">Filters</div>

      <div className="mt-4">
        <div className="mb-4">
          <div className="mt-2">
            <ActiveDeployments />
          </div>
        </div>
        <hr />
        <Accordion type="multiple">
          <AccordionItem value={filters.chain}>
            <AccordionTrigger className="w-full">Chain</AccordionTrigger>
            <AccordionContent>
              <ChainFull />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value={filters.level}>
            <AccordionTrigger className="w-full">Handlers</AccordionTrigger>
            <AccordionContent>
              <div className="max-h-[200px] overflow-y-auto">
                <HandlerFilter />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}

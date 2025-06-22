"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { ActiveDeployments } from "../(components)/ActiveDeployments";
import { Chain } from "../(components)/Chain";
import { LogLevelFilter } from "./(components)/LogLevelFilter";
import { TimestampRangeFilter } from "./(components)/TimestampRangeFilter";

export function Filters() {
  const filters = {
    chain: "chain",
    level: "level",
    timeRange: "timeRange",
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
        <div className="mb-4">
          <div className="mt-2">
            <Chain withLabel />
          </div>
        </div>
        <hr />
        <Accordion type="multiple">
          <AccordionItem value={filters.timeRange}>
            <AccordionTrigger className="w-full">Timestamp</AccordionTrigger>
            <AccordionContent>
              <div className="max-h-[200px] overflow-y-auto">
                <TimestampRangeFilter />
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value={filters.level}>
            <AccordionTrigger className="w-full">Log Level</AccordionTrigger>
            <AccordionContent>
              <div className="max-h-[200px] overflow-y-auto">
                <LogLevelFilter />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}

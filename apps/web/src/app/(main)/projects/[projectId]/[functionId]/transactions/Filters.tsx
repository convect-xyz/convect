"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { ActiveDeployments } from "../(components)/ActiveDeployments";
import { Chain } from "../(components)/Chain";
import { HandlerFilter } from "../(components)/HandlerFilter";
import { StatusFilter } from "../(components)/StatusFilter";

export function Filters() {
  const filters = {
    chain: "chain",
    handler: "handler",
    status: "status",
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
          <AccordionItem value={filters.handler}>
            <AccordionTrigger className="w-full">Handlers</AccordionTrigger>
            <AccordionContent>
              <div className="max-h-[200px] overflow-y-auto">
                <HandlerFilter />
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value={filters.status}>
            <AccordionTrigger className="w-full">Status</AccordionTrigger>
            <AccordionContent>
              <div className="max-h-[200px] overflow-y-auto">
                <StatusFilter />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}

"use client";

import { endOfDay, startOfDay } from "date-fns";
import { Card, CardContent } from "~/components/ui/card";
import { api } from "~/trpc/react";

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-screen-lg">
      <div className="text-3xl">Usage</div>
      <div>Manage your usage.</div>
      <div className="mt-4">
        <UsageAndBilling />
      </div>
    </div>
  );
}

function UsageAndBilling() {
  return (
    <div className="flex flex-col gap-2 rounded-md">
      <ProcessedTransactions />
    </div>
  );
}

function ProcessedTransactions() {
  const { data: usage } = api.accounts.getUsage.useQuery({
    periodStart: startOfDay(new Date()).getTime(),
    periodEnd: endOfDay(new Date()).getTime(),
  });

  return (
    <Card>
      <CardContent>{usage?.numProcessedTransactions}</CardContent>
    </Card>
  );
}

"use client";

import { useIsClient } from "@uidotdev/usehooks";
import { ArrowRight } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { api } from "~/trpc/react";

export function UpgradeDialog() {
  const params = useSearchParams();
  const {
    mutateAsync: getCheckoutSession,
    isPending: isGettingCheckoutSession,
  } = api.billing.switchPlan.useMutation();

  const [plan, setPlan] = useState(() => {
    const plan = params.get("plan_upgrade");
    if (plan && ["STARTUP", "PROFESSIONAL"].includes(plan)) {
      return plan;
    }

    return null;
  });

  const isClient = useIsClient();

  // hydration issues
  if (!isClient || !plan) {
    return null;
  }

  const handleClick = async () => {
    // const { url } = await getCheckoutSession({
    //   newPlan: plan as any,
    // });
    // window.location.assign(url);
  };

  return (
    <Dialog open={!!plan} onOpenChange={() => setPlan(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Switch Plans</DialogTitle>
          <DialogDescription>Update your plan</DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            className="w-full justify-between"
            disabled={isGettingCheckoutSession}
            onClick={handleClick}
          >
            Upgrade Now
            <ArrowRight strokeWidth={1.5} />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

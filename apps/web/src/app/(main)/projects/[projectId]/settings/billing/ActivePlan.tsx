"use client";

import { schema } from "@convect-xyz/server";
import { DialogProps } from "@radix-ui/react-dialog";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "~/components/ui/dialog";
import { api } from "~/trpc/react";
import { useParams } from "../../hooks/useParams";

export default function ActivePlan() {
  const [open, setOpen] = useState(false);
  const { projectId } = useParams();
  const { data: activePlan } = api.project.getActivePlan.useQuery({
    projectId,
  });
  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between"></div>
        <Card className="bg-background">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-1 items-center gap-2">
                <div className="">Active Plan</div>
                <div className="rounded-full border bg-background px-2 py-[2px] text-xs text-muted-foreground">
                  {activePlan?.name}
                </div>
              </div>
              <Button variant="outline" onClick={() => setOpen(true)}>
                Change Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <ChangePlanDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

function ChangePlanDialog(props: DialogProps) {
  return (
    <Dialog {...props}>
      <DialogContent className="py-4">
        <DialogTitle>Add Payment Method</DialogTitle>
        <div className="mt-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="text-xl">Downgrade to Hobby</div>
              <ChangePlanButton plan="HOBBY" />
            </div>
            <div className="flex items-center justify-between">
              <div className="text-xl">Upgrade to Pro</div>
              <ChangePlanButton plan="PRO" />
            </div>
            <div className="flex items-center justify-between">
              <div className="text-xl">Upgrade to Enterprise</div>

              <Button variant="outline">Contact US</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChangePlanButton(props: { plan: schema.PlanType }) {
  const { projectId } = useParams();
  const { mutateAsync: switchPlan } = api.billing.switchPlan.useMutation();

  return (
    <Button
      variant="outline"
      onClick={() => switchPlan({ newPlan: props.plan, projectId })}
    >
      Upgrade
    </Button>
  );
}

"use client";

import { DialogProps } from "@radix-ui/react-dialog";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import {
  PricingCard,
  PricingDescription,
  PricingHeader,
  PricingPrice,
  PricingTitle,
} from "~/app/(landing)/pricing/PricingCard";
import { BillingOverdueAlert } from "~/components/core/billing/BillingOverdueAlert";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "~/components/ui/dialog";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useParams } from "../../hooks/useParams";
import { useProject } from "../../hooks/useProject";
import { useActivePlan } from "./hooks/useActivePlan";
import { useUsage } from "./hooks/useUsage";

export default function ActivePlan() {
  const [open, setOpen] = useState(false);
  const { data: activePlan } = useActivePlan();
  const { data: project } = useProject();
  return (
    <>
      <div className="mb-4">
        {project?.billingStatus === "OVERDUE" && (
          <BillingOverdueAlert projectId={project.id} hideUpdateButton />
        )}
      </div>
      <div className="flex flex-col gap-4">
        <Card className="bg-background">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-1 items-center gap-2">
                <div className="">Active Plan</div>
                <div className="rounded-full border bg-background px-2 py-[2px] text-xs text-muted-foreground">
                  {activePlan?.name}
                </div>
              </div>
              <Button onClick={() => setOpen(true)}>Change Plan</Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <ChangePlanDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

type ActionProps = {
  onPlanChanged: () => void;
};

const plans = [
  {
    type: "HOBBY" as const,
    name: "Hobby",
    description: "For hobbyists and small projects.",
    price: "$20",
    schedule: "MONTHLY",
    additionalFeesApply: true,
    action: (props: ActionProps) => (
      <ChangePlanButton plan="HOBBY" onPlanChanged={props.onPlanChanged} />
    ),
  },
  {
    type: "PRO" as const,
    name: "Pro",
    description: "Perfect for startups and professionals.",
    price: "$99",
    schedule: "MONTHLY",
    additionalFeesApply: true,
    action: (props: ActionProps) => (
      <ChangePlanButton plan="PRO" onPlanChanged={props.onPlanChanged} />
    ),
  },
  {
    type: "ENTERPRISE" as const,
    name: "Enterprise",
    description: "Suited for advanced use cases.",
    price: "Custom",
    schedule: "MONTHLY",
    additionalFeesApply: true,
    action: (props: ActionProps) => {
      const { data: activePlan } = useActivePlan();
      return (
        <Button
          className="w-full"
          variant={activePlan?.name === "ENTERPRISE" ? "outline" : "default"}
          disabled={activePlan?.name === "ENTERPRISE"}
        >
          <a href="mailto:support@convect.xyz" target="_blank">
            {activePlan?.name === "ENTERPRISE" ? "Current Plan" : "Contact Us"}
          </a>
        </Button>
      );
    },
  },
];

function ChangePlanDialog(props: DialogProps) {
  const { data: activePlan } = useActivePlan();

  return (
    <Dialog {...props}>
      <DialogContent className="max-w-screen-lg py-4">
        <DialogTitle className="text-2xl">Select Plan</DialogTitle>
        <div className="mt-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {plans.map((plan) => (
              <PricingCard
                key={plan.type}
                className={cn(
                  activePlan?.isActive(plan.type) && "border-white",
                )}
              >
                <PricingHeader>
                  <PricingTitle title={plan.name} />
                  <PricingDescription description={plan.description} />
                </PricingHeader>
                <PricingPrice price={plan.price} />
                {
                  <plan.action
                    onPlanChanged={() => props.onOpenChange?.(false)}
                  />
                }
              </PricingCard>
            ))}
          </div>

          <div className="mb-4 mt-8 text-center text-sm text-muted-foreground">
            *Additional fees apply for usage outside of the included limits. See{" "}
            <Link href="/pricing" target="_blank" className="underline">
              pricing
            </Link>{" "}
            page for more details.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChangePlanButton(props: {
  plan: "HOBBY" | "PRO";
  onPlanChanged: () => void;
}) {
  const { projectId } = useParams();
  const { data, refetch: refetchActivePlan } = useActivePlan();
  const { refetch: refetchUsage } = useUsage();
  const { mutateAsync: switchPlan, isPending } =
    api.billing.switchPlan.useMutation({
      onSuccess: () => {
        refetchActivePlan();
        refetchUsage();
        props.onPlanChanged();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  const getLabelForPlan = (plan: "HOBBY" | "PRO") => {
    if (data?.isActive(plan)) {
      return "Current Plan";
    }

    if (plan === "PRO") {
      if (data?.name === "ENTERPRISE") {
        return "Downgrade to Pro";
      }

      return "Upgrade to Pro";
    }

    if (plan === "HOBBY") {
      if (data?.name === "ENTERPRISE" || data?.name === "PRO") {
        return "Downgrade to Hobby";
      }

      return "Upgrade to Hobby";
    }

    return "Upgrade";
  };

  return (
    <Button
      variant={data?.isActive(props.plan) ? "outline" : "default"}
      isLoading={isPending}
      disabled={data?.isActive(props.plan)}
      onClick={() => switchPlan({ newPlan: props.plan, projectId })}
    >
      {getLabelForPlan(props.plan)}
    </Button>
  );
}

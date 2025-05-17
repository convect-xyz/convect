"use client";

import { DialogProps } from "@radix-ui/react-dialog";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { api } from "~/trpc/react";
import { useParams } from "../../hooks/useParams";
import { useActivePlan } from "./hooks/useActivePlan";
import { useUsage } from "./hooks/useUsage";

export default function CancelPlan() {
  const [open, setOpen] = useState(false);
  const { projectId } = useParams();
  const { data: activePlan, refetch: refetchActivePlan } = useActivePlan();
  const { refetch: refetchUsage } = useUsage();
  const { mutateAsync: cancelPlan, isPending } =
    api.billing.cancelPlan.useMutation({
      onSuccess: () => {
        toast.success("Your plan has been cancelled.");
        refetchActivePlan();
        refetchUsage();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  if (activePlan?.isActive("BASE")) {
    return null;
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <Card className="bg-background">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-1 items-center gap-2">
                <div className="">Cancel Plan</div>
              </div>
              <Button onClick={() => setOpen(true)} isLoading={isPending}>
                Cancel Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <CancelPlanDialog
        open={open}
        onOpenChange={setOpen}
        onConfirm={() => cancelPlan({ projectId })}
      />
    </>
  );
}

function CancelPlanDialog(props: DialogProps & { onConfirm: () => void }) {
  return (
    <AlertDialog {...props}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. You will be unable to create new
            Convect Functions.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => props.onConfirm()}>
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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

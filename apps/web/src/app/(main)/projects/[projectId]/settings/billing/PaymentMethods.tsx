"use client";

import { DialogProps } from "@radix-ui/react-dialog";
import {
  CardCvcElement,
  CardExpiryElement,
  CardNumberElement,
  Elements,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useMutation } from "@tanstack/react-query";
import { times } from "lodash";
import { ComponentProps, PropsWithChildren, useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "~/components/ui/dialog";
import { Skeleton } from "~/components/ui/skeleton";
import { env } from "~/env";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useParams } from "../../hooks/useParams";

const stripePromise = loadStripe(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

export default function PaymentMethods() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="text-xl">Payment Methods</div>
          <Button variant="outline" onClick={() => setOpen(true)}>
            Add Payment Method
          </Button>
        </div>
        <Card className="bg-background">
          <CardContent className="p-0">
            <ListPaymentMethods />
          </CardContent>
        </Card>
      </div>
      <AddPaymentMethodDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

function AddPaymentMethodDialog(props: DialogProps) {
  return (
    <Dialog {...props}>
      <DialogContent className="py-4">
        <DialogTitle>Add Payment Method</DialogTitle>
        <div className="mt-4">
          <Content {...props} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Content(props: DialogProps) {
  const { projectId } = useParams();
  const { data: setupIntent } = api.project.getStripeSetupIntent.useQuery({
    projectId,
  });

  return (
    <Elements
      options={{
        clientSecret: setupIntent?.clientSecret,
        fonts: [
          {
            family: "Manrope",
            cssSrc:
              "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap",
          },
        ],
        appearance: {
          theme: "night",
          variables: {
            fontFamily: "Manrope",
          },
        },
      }}
      stripe={stripePromise}
    >
      <AddPaymentMethod {...props} />
    </Elements>
  );
}

function AddPaymentMethod(props: DialogProps) {
  const stripe = useStripe();
  const elements = useElements();
  const utils = api.useUtils();
  const { projectId } = useParams();
  const { data: setupIntent } = api.project.getStripeSetupIntent.useQuery({
    projectId,
  });
  const { mutateAsync: setDefaultPaymentMethod } =
    api.project.setDefaultPaymentMethod.useMutation();

  const {
    mutateAsync: createPaymentMethod,
    isPending: isCreatingPaymentMethod,
    error: createPaymentMethodError,
  } = useMutation({
    mutationKey: ["accounts/create-payment-method"],
    mutationFn: async () => {
      if (!stripe || !elements || !setupIntent) {
        return;
      }

      const response = await stripe.confirmCardSetup(setupIntent.clientSecret, {
        payment_method: {
          card: elements.getElement(CardNumberElement)!,
        },
      });
      if (response.error) {
        throw response.error;
      }

      const responseIntent = response.setupIntent;
      const paymentMethodId =
        typeof responseIntent.payment_method === "string"
          ? responseIntent.payment_method
          : responseIntent.payment_method?.id;
      if (!paymentMethodId) {
        throw new Error("No payment method ID");
      }

      await setDefaultPaymentMethod({
        paymentMethodId: paymentMethodId,
        projectId,
      });
      await utils.project.getPaymentMethods.refetch();
    },
    onSuccess: () => {
      toast.success("Payment method added successfully");
      props.onOpenChange?.(false);
    },
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await createPaymentMethod();
  };

  const style = {
    base: {
      fontSize: "16px",
      fontFamily: "Manrope",
      color: "#fff",
      padding: "5px",
    },
  };
  return (
    <form onSubmit={handleSubmit}>
      <div className="flex gap-2">
        <InputWrapper className="flex flex-1 items-center">
          <CardNumberElement
            options={{
              style,
              showIcon: true,
            }}
          />
        </InputWrapper>
        <InputWrapper className="basis-[100px]">
          <CardCvcElement
            options={{
              style,
            }}
          />
        </InputWrapper>
        <InputWrapper className="basis-[100px]">
          <CardExpiryElement
            options={{
              style,
            }}
          />
        </InputWrapper>
      </div>
      {createPaymentMethodError && (
        <div className="my-2 text-sm text-red-500">
          {createPaymentMethodError.message}
        </div>
      )}
      <div className="mt-8">
        <Button
          type="submit"
          variant="default"
          isLoading={isCreatingPaymentMethod}
        >
          Add Payment Method
        </Button>
      </div>
    </form>
  );
}

function InputWrapper({
  children,
  className,
  ...props
}: PropsWithChildren<ComponentProps<"div">>) {
  return (
    <div
      className={cn(
        "flex h-9 items-center rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <div className="flex-1">{children}</div>
    </div>
  );
}

function ListPaymentMethods() {
  const { projectId } = useParams();
  const { data: paymentMethods } = api.project.getPaymentMethods.useQuery({
    projectId,
  });

  if (paymentMethods && paymentMethods.length === 0) {
    return (
      <div className="flex items-center justify-center py-10 text-sm">
        No payment methods added.
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y">
      {!paymentMethods &&
        times(3).map((v) => (
          <div key={v} className="flex items-center gap-2 p-4 py-5 text-sm">
            <div className="flex flex-1 items-center gap-2">
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="text-right">
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        ))}
      {paymentMethods?.map((method) => (
        <div
          key={method.id}
          className="flex items-center gap-2 p-4 py-5 text-sm"
        >
          <div className="flex flex-1 items-center gap-2">
            <div>
              {method.brand} &bull;&bull;&bull;&bull; {method.last4}
            </div>
            {method.default && (
              <div className="rounded-full border bg-background px-2 py-[2px] text-xs text-muted-foreground">
                default
              </div>
            )}
          </div>
          <div className="text-right">
            Valid until {method.exp_month} / {method.exp_year}
          </div>
        </div>
      ))}
    </div>
  );
}

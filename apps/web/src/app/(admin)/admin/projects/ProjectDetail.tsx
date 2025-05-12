"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format, millisecondsToSeconds } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { ReactNode } from "react";
import { useForm, useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { formatDate } from "~/lib/shared/utils/formatting";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useAdminProject } from "./hooks/useAdminProject";

export default function ProjectDetail(props: { projectId?: number }) {
  const { data } = useAdminProject(props.projectId);

  if (!props.projectId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Select a project</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-4 max-w-screen-md px-4 pb-10 pt-6">
      <div className="rounded-md border p-4">
        <div className="flex items-center gap-2">
          <h1>{data.name}</h1>
          <div className="rounded-full border bg-muted px-2 text-xs text-muted-foreground">
            {data.planType}
          </div>
        </div>
      </div>

      <Plan projectId={props.projectId} />
    </div>
  );
}

function PlanInformation(props: { projectId: number }) {
  const { data } = useAdminProject(props.projectId);
  const form = useFormContext<Values>();
  if (!data) {
    return null;
  }

  if (!data.stripeSubscription) {
    return (
      <div className="mt-4 flex flex-col divide-y rounded-md border">
        <PlanInformationRow
          label="Backdate Start Date"
          value={
            <FormField
              control={form.control}
              name="backdateStartDateSecs"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          size="sm"
                          className={cn(
                            "w-[180px] pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground",
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          if (date) {
                            field.onChange(
                              new Date(
                                Date.UTC(
                                  date.getFullYear(),
                                  date.getMonth(),
                                  date.getDate(),
                                ),
                              ),
                            );
                          } else {
                            field.onChange(undefined);
                          }
                        }}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          }
        />
        <PlanInformationRow
          label="Billing Cycle Anchor"
          value={
            <FormField
              control={form.control}
              name="billingCycleAnchorSecs"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          size="sm"
                          className={cn(
                            "w-[180px] pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground",
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          if (date) {
                            field.onChange(
                              new Date(
                                Date.UTC(
                                  date.getFullYear(),
                                  date.getMonth(),
                                  date.getDate(),
                                ),
                              ),
                            );
                          } else {
                            field.onChange(undefined);
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          }
        />
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col divide-y rounded-md border">
      <PlanInformationRow
        label="Billing Start Date"
        value={formatDate(new Date(data.stripeSubscription.start_date * 1000))}
      />
      <PlanInformationRow
        label="Billing Cycle Anchor"
        value={formatDate(
          new Date(data.stripeSubscription.billing_cycle_anchor * 1000),
        )}
      />
      <PlanInformationRow
        label="Next Billing Date"
        value={formatDate(
          new Date(data.stripeSubscription.current_period_end * 1000),
        )}
      />
    </div>
  );
}

function PlanInformationRow(props: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 p-3">
      <div className="text-xs">{props.label}</div>
      <div className="text-xs text-muted-foreground">{props.value}</div>
    </div>
  );
}
const formSchema = z.object({
  backdateStartDateSecs: z.date().optional(),
  billingCycleAnchorSecs: z.date().optional(),
  pricing: z.array(
    z
      .object({
        key: z.string(),
        priceType: z.enum(["tiered", "fixed"]),
        includedFree: z.coerce.number().optional(),
        priceInCentsPerAdditionalUnit: z.coerce.string().optional(),
        priceInCents: z.coerce.string().optional(),
      })
      .refine(
        (data) => {
          if (data.priceType === "tiered") {
            return (
              data.includedFree !== undefined &&
              data.priceInCentsPerAdditionalUnit !== undefined
            );
          }

          return data.priceInCents !== undefined;
        },
        { message: "Invalid price type" },
      ),
  ),
});

type Values = z.infer<typeof formSchema>;

function Plan(props: { projectId: number }) {
  const { data } = useAdminProject(props.projectId);
  const { mutateAsync: updatePlan } = api.admin.updatePlan.useMutation({
    onSuccess: () => {
      toast.success("Plan updated");
    },
  });

  const form = useForm<Values>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pricing: data!.plan.pricing.map((pricing) => ({
        key: pricing.key,
        priceType: pricing.price._type,
        includedFree:
          pricing.price._type === "tiered"
            ? pricing.price.includedFree
            : undefined,
        priceInCentsPerAdditionalUnit:
          pricing.price._type === "tiered"
            ? pricing.price.priceInCentsPerAdditionalUnit
            : undefined,
        priceInCents:
          pricing.price._type === "fixed"
            ? pricing.price.priceInCents
            : undefined,
      })),
    },
  });

  console.log(form.watch("backdateStartDateSecs"));

  const onSubmit = (values: Values) =>
    updatePlan({
      projectId: props.projectId,
      backdateStartDateSecs: values.backdateStartDateSecs
        ? millisecondsToSeconds(values.backdateStartDateSecs.getTime())
        : undefined,
      billingCycleAnchorSecs: values.billingCycleAnchorSecs
        ? millisecondsToSeconds(values.billingCycleAnchorSecs.getTime())
        : undefined,
      prices: values.pricing.map((pricing) => ({
        ...pricing,
        price:
          pricing.priceType === "tiered"
            ? {
                _type: "tiered",
                includedFree: pricing.includedFree!,
                priceInCentsPerAdditionalUnit:
                  pricing.priceInCentsPerAdditionalUnit!,
              }
            : {
                _type: "fixed",
                priceInCents: pricing.priceInCents!,
              },
      })),
    });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="mt-8 flex flex-col gap-4">
          <div className="flex justify-between">
            <div className="text-muted-foreground">Plan</div>
            <Button
              size="sm"
              type="submit"
              isLoading={form.formState.isSubmitting}
            >
              Save
            </Button>
          </div>
          <PlanInformation projectId={props.projectId} />

          <div className="flex flex-col gap-2">
            {data?.plan.pricing.map((pricing, index) => {
              return (
                <div
                  key={pricing.product.name}
                  className="rounded-md border p-4"
                >
                  <div className="flex flex-col gap-2">
                    <div>{pricing.product.name}</div>
                  </div>
                  <div className="mt-2 flex flex-col gap-2">
                    {pricing.product.billing._type === "tiered" && (
                      <TieredBilling index={index} />
                    )}
                    {pricing.product.billing._type === "fixed" && (
                      <FixedBilling index={index} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </form>
    </Form>
  );
}

function TieredBilling(props: { index: number }) {
  const { index } = props;
  const form = useFormContext<Values>();

  return (
    <div className="flex flex-col gap-2">
      <FormField
        control={form.control}
        name={`pricing.${index}.priceInCentsPerAdditionalUnit`}
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <div className="flex items-center gap-2">
                <div className="flex-1 text-xs text-muted-foreground">
                  Price per add. (
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                    maximumFractionDigits: 12,
                  }).format(Number(field.value) / 100)}
                  )
                </div>
                <Input className="h-auto w-32" {...field} />
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name={`pricing.${index}.includedFree`}
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <div className="flex items-center gap-2">
                <div className="flex-1 text-xs text-muted-foreground">
                  Included free (
                  {new Intl.NumberFormat("en-US", {
                    style: "decimal",
                  }).format(Number(field.value))}
                  )
                </div>
                <Input className="h-auto w-32" {...field} />
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

function FixedBilling(props: { index: number }) {
  const { index } = props;
  const form = useFormContext<Values>();
  return (
    <div>
      <FormField
        control={form.control}
        name={`pricing.${index}.priceInCents`}
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <div className="flex items-center gap-2">
                <div className="flex-1 text-xs text-muted-foreground">
                  Fixed Price (
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                  }).format(Number(field.value) / 100)}
                  )
                </div>
                <Input className="h-auto w-32" {...field} />
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

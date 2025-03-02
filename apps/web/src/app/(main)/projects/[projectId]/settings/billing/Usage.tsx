"use client";

import { endOfMonth, startOfMonth } from "date-fns";
import { times } from "lodash";
import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { formatCurrency } from "~/lib/shared/utils/formatting";
import { api } from "~/trpc/react";
import { RouterOutputs } from "~/trpc/shared";
import { useParams } from "../../hooks/useParams";

type UsageMetric = RouterOutputs["project"]["getUsage"][number];

export default function Usage() {
  const { projectId } = useParams();
  const { data: usage } = api.project.getUsage.useQuery({
    projectId,
    periodStart: startOfMonth(new Date()).getTime(),
    periodEnd: endOfMonth(new Date()).getTime(),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xl">Usage</div>
      <Card className="bg-background">
        <CardContent className="p-1">
          <div className="flex gap-2 p-2 text-xs font-medium text-muted-foreground">
            <div className="flex-1">Product</div>
            <div className="basis-[140px] text-right">Included Free</div>
            <div className="basis-[120px] text-right">On Demand</div>
            <div className="basis-[140px] text-right">Charge</div>
          </div>

          {usage?.map((metric) => <Product key={metric.key} metric={metric} />)}
          {!usage && times(10).map((v) => <ProductSkeleton key={v} />)}
        </CardContent>
      </Card>
    </div>
  );
}

function Product(props: { metric: UsageMetric }) {
  const { metric } = props;

  const getOnDemandUsage = () => {
    const totalUsage = metric.totalUsage;
    const includedFree = metric.includedFree;

    if (totalUsage < includedFree) {
      return null;
    }

    return totalUsage - includedFree;
  };

  const onDemandUsage = getOnDemandUsage();

  return (
    <div className="flex cursor-pointer items-center gap-2 rounded-md p-2 text-sm odd:bg-black hover:bg-muted">
      <div className="flex flex-1 items-center gap-2">
        <Progress
          value={metric.includedFreeUsageAsFraction}
          height={25}
          width={25}
        />
        <div className="font-medium">{metric.name}</div>
      </div>
      <div className="basis-[140px] text-right">
        {Math.min(metric.totalUsage, metric.includedFree)} /{" "}
        {metric.includedFree} {metric.unitSymbol}
      </div>
      <div className="basis-[120px] text-right">
        {onDemandUsage && (
          <>
            +{onDemandUsage.toFixed(2)} {metric.unitSymbol}
          </>
        )}
      </div>
      <div className="basis-[140px] text-right">
        {formatCurrency(metric.additionalChargeInCents)}
      </div>
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div className="flex cursor-pointer items-center gap-2 rounded-md p-2 text-sm odd:bg-black hover:bg-muted">
      <div className="flex flex-1 items-center gap-2">
        <Skeleton className="aspect-square h-6 w-6 rounded-full" />
        <Skeleton className="max-w-20 h-5 w-full" />
      </div>
      <div className="basis-[140px] text-right">
        <Skeleton className="ml-auto h-5 w-14" />
      </div>
      <div className="basis-[120px] text-right">
        <Skeleton className="ml-auto h-5 w-14" />
      </div>
      <div className="basis-[140px] text-right">
        <Skeleton className="ml-auto h-5 w-8" />
      </div>
    </div>
  );
}

function Progress({
  value,
  ...rest
}: { value: number } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="200"
      height="200"
      viewBox="-25 -25 250 250"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        transform: "rotate(-90deg)",
      }}
      {...rest}
    >
      <circle
        r="90"
        cx="100"
        cy="100"
        fill="transparent"
        stroke="#191B1F"
        stroke-width="16px"
        stroke-dasharray="565.48px"
        stroke-dashoffset="0"
      ></circle>
      <circle
        r="90"
        cx="100"
        cy="100"
        stroke="#76e5b1"
        stroke-width="15"
        stroke-linecap="round"
        stroke-dashoffset={`${565.48 - 565.48 * value}px`}
        fill="transparent"
        stroke-dasharray="565.48px"
      ></circle>
    </svg>
  );
}

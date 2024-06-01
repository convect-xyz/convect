import { ComponentProps, PropsWithChildren } from "react";

export function PricingCard(props: PropsWithChildren) {
  return (
    <div className="rounded-lg bg-muted p-6 shadow-sm">
      <div className="space-y-4">{props.children}</div>
    </div>
  );
}

export function PricingHeader(props: PropsWithChildren) {
  return <div className="space-y-2">{props.children}</div>;
}
export function PricingTitle(props: { title: string }) {
  return <h3 className="text-2xl font-bold">{props.title}</h3>;
}

export function PricingDescription(props: { description: string }) {
  return (
    <p className="h-[50px] text-gray-500 dark:text-gray-400">
      {props.description}
    </p>
  );
}

export function PricingPrice(
  props: PropsWithChildren<{
    price:
      | {
          value: string;
          schedule: "MONTHLY";
        }
      | string;
  }>,
) {
  return (
    <div className="space-y-1">
      <span className="text-4xl font-bold">
        {typeof props.price === "string" ? props.price : props.price.value}
      </span>
      {typeof props.price !== "string" && (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          per month
        </span>
      )}
    </div>
  );
}

export function PricingFeatures(props: PropsWithChildren) {
  return <ul className="space-y-2 text-sm">{props.children}</ul>;
}

export function PricingFeature(props: PropsWithChildren<{ feature: string }>) {
  return (
    <li className="flex items-center">
      <CheckIcon className="mr-2 h-4 w-4 text-primary" />
      {props.feature}
    </li>
  );
}

function CheckIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

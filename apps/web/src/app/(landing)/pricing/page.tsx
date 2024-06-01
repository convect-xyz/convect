import { ComponentProps } from "react";
import { Button } from "~/components/ui/button";

export default function Page() {
  return (
    <div className="py-12 md:py-24 lg:py-32">
      <div className="container max-w-screen-lg px-4 md:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Pricing Plans</h2>
          <p className="text-muted-foreground">Choose the best one for you.</p>
        </div>
        <div className="mt-16 grid gap-8 md:grid-cols-3 md:gap-6 lg:gap-12">
          <PricingCard
            title="Free"
            description="Get started with our free plan."
          />
          <PricingCard
            title="Startup"
            description="Perfect for startups."
            price="$9"
          />
          <PricingCard
            title="Professional"
            description="Better suited for advanced use cases."
            price="$50"
          />
        </div>
        <FAQ />
      </div>
    </div>
  );
}

type PricingCardProps = {
  title: string;
  description: string;
  price?: string;
};

function PricingCard(props: PricingCardProps) {
  return (
    <div className="rounded-lg bg-muted p-6 shadow-sm">
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-2xl font-bold">{props.title}</h3>
          <p className="h-[50px] text-gray-500 dark:text-gray-400">
            {props.description}
          </p>
        </div>
        <div className="space-y-1">
          <span className="text-4xl font-bold">{props.price ?? "Free"}</span>
          {props.price && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              per month
            </span>
          )}
        </div>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center">
            <CheckIcon className="mr-2 h-4 w-4 text-primary" />
            Up to 5 users
          </li>
          <li className="flex items-center">
            <CheckIcon className="mr-2 h-4 w-4 text-primary" />1 GB storage
          </li>
          <li className="flex items-center">
            <CheckIcon className="mr-2 h-4 w-4 text-primary" />
            Basic analytics
          </li>
          <li className="flex items-center">
            <CheckIcon className="mr-2 h-4 w-4 text-primary" />
            Email support
          </li>
        </ul>
        <Button className="w-full">Get Started</Button>
      </div>
    </div>
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

function FAQ() {
  return (
    <div className="mt-24">
      <h2 className="text-center text-2xl font-bold">
        Frequently Asked Questions
      </h2>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="font-semibold">What payment methods do you accept?</h3>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">
            We accept all major credit cards.
          </p>
        </div>
        <div>
          <h3 className="font-semibold">Can I cancel my subscription?</h3>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">
            Yes, you can cancel your subscription at any time.
          </p>
        </div>
        <div>
          <h3 className="font-semibold">Do you offer any discounts?</h3>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">
            Yes, we offer a discount for annual subscriptions.
          </p>
        </div>
        <div>
          <h3 className="font-semibold">What if I need more help?</h3>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">
            Our support team is available 24/7 to help you with your needs.
          </p>
        </div>
      </div>
    </div>
  );
}

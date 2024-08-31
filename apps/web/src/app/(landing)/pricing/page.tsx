import { signIn } from "~/auth";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  PricingCard,
  PricingDescription,
  PricingHeader,
  PricingPrice,
  PricingTitle,
} from "./PricingCard";

export default function Page() {
  return (
    <div className="py-12 md:py-24 lg:py-32">
      <div className="container max-w-screen-lg px-4 md:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Pricing Plans</h2>
          <p className="text-muted-foreground">Choose the best one for you.</p>
        </div>
        <div className="mt-16 grid gap-8 md:grid-cols-3 md:gap-6 lg:gap-12">
          <PricingCard>
            <PricingHeader>
              <PricingTitle title="Hobby" />
              <PricingDescription description="Get started with our free plan." />
            </PricingHeader>
            <PricingPrice price={{ value: "$0", schedule: "MONTHLY" }} />
            <form
              className="mt-auto pt-5"
              action={async () => {
                "use server";

                await signIn("github", { redirectTo: "/projects" });
              }}
            >
              <Button className="w-full">Get Started</Button>
            </form>
          </PricingCard>

          <PricingCard>
            <PricingHeader>
              <PricingTitle title="Pro" />
              <PricingDescription description="Perfect for startups and professionals." />
            </PricingHeader>
            <PricingPrice price={{ value: "$20", schedule: "MONTHLY" }} />
            <form
              className="mt-auto pt-5"
              action={async () => {
                "use server";

                await signIn("github", {
                  redirectTo: "/projects?plan_upgrade=STARTUP",
                });
              }}
            >
              <Button className="w-full">Get Started</Button>
            </form>
          </PricingCard>

          <PricingCard>
            <PricingHeader>
              <PricingTitle title="Enterprise" />
              <PricingDescription description="Better suited for advanced use cases." />
            </PricingHeader>
            <PricingPrice price="Contact Us" />
            <form
              className="mt-auto pt-5"
              action={async () => {
                "use server";
                await signIn("github", {
                  redirectTo: "/projects?plan_upgrade=PROFESSIONAL",
                });
              }}
            >
              <Button className="w-full">Get Started</Button>
            </form>
          </PricingCard>
        </div>

        <MorePricing />
        <FAQ />
      </div>
    </div>
  );
}

function MorePricing() {
  return (
    <Card className="mt-24 bg-background p-0">
      <CardContent className="p-0">
        <div className="flex flex-col divide-y divide-border">
          <div className="flex divide-x divide-border">
            <div className="flex-[2_2_0] p-4">Feature</div>
            <div className="flex-[3_3_0] p-4">Hobby</div>
            <div className="flex-[3_3_0] p-4">Pro</div>
            <div className="flex-[3_3_0] p-4">Enterprise</div>
          </div>
          <PricingRow
            feature="Invocations"
            hobby="10,000 invocations included"
            pro="100,000 invocations included then $0.60 per million"
          />
          <PricingRow
            feature="Duration"
            hobby="10 GB-hours included"
            pro="100 GB-hours included then $0.18 per GB-Hour"
          />
          <PricingRow
            feature="Processed Transactions"
            hobby="1,000 processed transactions included."
            pro="10,000 processed transactions included then $0.20 per 100,000"
          />
        </div>
      </CardContent>
    </Card>
  );
}

type PricingRowProps = {
  feature: string;
  hobby: string;
  pro: string;
};

function PricingRow(props: PricingRowProps) {
  return (
    <div className="flex divide-x divide-border">
      <div className="flex-[2_2_0] p-4">{props.feature}</div>
      <div className="flex-[3_3_0] p-4">{props.hobby}</div>
      <div className="flex-[3_3_0] p-4">{props.pro}</div>
      <div className="flex flex-[3_3_0] items-center justify-center p-4">
        Custom
      </div>
    </div>
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
            Feel free to contact us via support@convect.xyz
          </p>
        </div>
      </div>
    </div>
  );
}

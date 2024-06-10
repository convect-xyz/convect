import { signIn } from "~/auth";
import { Button } from "~/components/ui/button";
import {
  PricingCard,
  PricingDescription,
  PricingFeature,
  PricingFeatures,
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
              <PricingTitle title="Free" />
              <PricingDescription description="Get started with our free plan." />
            </PricingHeader>
            <PricingPrice price={{ value: "$0", schedule: "MONTHLY" }} />
            <PricingFeatures>
              <PricingFeature feature="100k transactions per month" />
              <PricingFeature feature="Function analytics" />
            </PricingFeatures>
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
              <PricingTitle title="Startup" />
              <PricingDescription description="Perfect for startups." />
            </PricingHeader>
            <PricingPrice price={{ value: "$20", schedule: "MONTHLY" }} />
            <PricingFeatures>
              <PricingFeature feature="2m free transactions per month" />
              <PricingFeature feature="Function analytics" />
            </PricingFeatures>
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
              <PricingTitle title="Professional" />
              <PricingDescription description="Better suited for advanced use cases." />
            </PricingHeader>
            <PricingPrice price="Contact Us" />
            <PricingFeatures>
              <PricingFeature feature="Custom transaction processing" />
              <PricingFeature feature="Function analytics" />
              <PricingFeature feature="Engineering Support" />
            </PricingFeatures>
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
        <FAQ />
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

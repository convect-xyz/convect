import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getReactQueryHelper } from "~/trpc/server";
import { RouterOutputs } from "~/trpc/shared";
import Overview from "./Overview";
import PaymentMethods from "./PaymentMethods";

type UsageMetric = RouterOutputs["accounts"]["getUsage"][number];

export default async function Page() {
  const helper = await getReactQueryHelper();
  const c = await helper.accounts.getStripeSetupIntent.fetch({});
  return (
    <HydrationBoundary state={dehydrate(helper.queryClient)}>
      <div className="mx-auto w-full max-w-screen-lg">
        <div className="mt-4">
          <PaymentMethods />
        </div>
        <div className="mt-4">
          <Overview />
        </div>
      </div>
    </HydrationBoundary>
  );
}

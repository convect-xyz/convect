import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getReactQueryHelper } from "~/trpc/server";
import ActivePlan from "./ActivePlan";
import Overview from "./Overview";
import PaymentMethods from "./PaymentMethods";

export default async function Page() {
  const helper = await getReactQueryHelper();
  await Promise.all([
    helper.accounts.getStripeSetupIntent.prefetch({}),
    helper.accounts.getActivePlan.prefetch({}),
  ]);

  return (
    <HydrationBoundary state={dehydrate(helper.queryClient)}>
      <div className="mx-auto w-full max-w-screen-lg">
        <div className="mt-4">
          <ActivePlan />
        </div>
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

import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getReactQueryHelper } from "~/trpc/server";
import BackToSettings from "../(components)/BackToSettings";
import ActivePlan from "./ActivePlan";
import Overview from "./Overview";
import PaymentMethods from "./PaymentMethods";

export default async function Page(props: { params: { projectId: string } }) {
  const helper = await getReactQueryHelper();
  await Promise.all([
    helper.project.getStripeSetupIntent.prefetch({
      projectId: Number(props.params.projectId),
    }),
    helper.project.getActivePlan.prefetch({
      projectId: Number(props.params.projectId),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(helper.queryClient)}>
      <div>
        <BackToSettings />
        <div className="mx-auto w-full px-4">
          <div>
            <ActivePlan />
          </div>
          <div className="mt-4">
            <PaymentMethods />
          </div>
          <div className="mt-4">
            <Overview />
          </div>
        </div>
      </div>
    </HydrationBoundary>
  );
}

import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "~/db";
import schema from "~/db/schema";

export async function handleSubscriptionCreatedOrUpdated(
  event:
    | Extract<Stripe.Event, { type: "customer.subscription.created" }>
    | Extract<Stripe.Event, { type: "customer.subscription.updated" }>
) {
  const data = event.data.object;
  const planType = data.metadata.planType;
  if (!planType) {
    throw new Error("Plan type not found in metadata for subscription");
  }

  const stripeCustomerId =
    typeof data.customer === "string" ? data.customer : data.customer.id;

  await db
    .update(schema.projects)
    .set({
      planType: planType as any,
    })
    .where(eq(schema.projects.stripeCustomerId, stripeCustomerId))
    .returning({ stripeSubscriptionId: schema.projects.stripeSubscriptionId })
    .then((c) => c.at(0)!.stripeSubscriptionId!);
}

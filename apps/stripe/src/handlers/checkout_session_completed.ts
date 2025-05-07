import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "~/db";
import schema from "~/db/schema";

export async function handleCheckoutSessionComplete(
  event: Extract<Stripe.Event, { type: "checkout.session.completed" }>
) {
  const data = event.data.object;

  const client_reference_id = event.data.object.client_reference_id;
  if (!client_reference_id) {
    throw new Error("No Client Reference ID");
  }

  const customerId =
    typeof data.customer === "string" ? data.customer : data.customer?.id;
  const planType = data.metadata!["plan"]! as any;

  await db
    .update(schema.projects)
    .set({
      stripeCustomerId: customerId,
      planType,
    })
    .where(eq(schema.projects.id, Number(client_reference_id)));
}

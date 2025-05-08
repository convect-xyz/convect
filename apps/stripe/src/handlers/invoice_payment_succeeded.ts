import { secondsToMilliseconds } from "date-fns";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "~/db";
import schema from "~/db/schema";

export async function handleInvoicePaymentSucceeded(
  event: Extract<Stripe.Event, { type: "invoice.payment_succeeded" }>
) {
  const data = event.data.object;

  const customerId =
    typeof data.customer === "string" ? data.customer : data.customer?.id;
  if (!customerId) {
    throw new Error("No Customer ID");
  }

  await db
    .update(schema.projects)
    .set({
      billingStatus: "ACTIVE",
      billingStatusUpdatedAt: new Date(secondsToMilliseconds(event.created)),
    })
    .where(eq(schema.projects.stripeCustomerId, customerId));
}

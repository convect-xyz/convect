import { Context, EventBridgeEvent, SQSEvent } from "aws-lambda";
import { eq } from "drizzle-orm";
import { Stripe } from "stripe";
import { db } from "./db";
import schema from "./db/schema";
import { env } from "./env";

export const stripe = new Stripe(env.STRIPE_API_KEY);

export const handler = async (event: SQSEvent, context: Context) => {
  const stripeEvents = event.Records.map((record) => {
    return JSON.parse(record.body) as EventBridgeEvent<string, Stripe.Event>;
  });

  for (const stripeEvent of stripeEvents) {
    try {
      await processStripeEvent(stripeEvent.detail);
    } catch (error) {
      console.error("Error processing Stripe event:", error);
    }
  }

  return {};
};

async function processStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionComplete(event);
      break;
    case "invoice.paid":
      break;
    case "invoice.payment_failed":
      // The payment failed or the customer does not have a valid payment method.
      // The subscription becomes past_due. Notify your customer and send them to the
      // customer portal to update their payment information.
      break;
    case "payment_method.attached":
      await setDefaultPaymentMethod(event);
      break;
    default:
    // Unhandled event type
  }
}

async function handleCheckoutSessionComplete(
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

async function setDefaultPaymentMethod(
  event: Extract<Stripe.Event, { type: "payment_method.attached" }>
) {
  const data = event.data.object;

  const customerId =
    typeof data.customer === "string" ? data.customer : data.customer?.id;
  const customer = await stripe.customers.retrieve(customerId!);

  if (customer.deleted) {
    return;
  }

  await stripe.customers.update(customerId!, {
    invoice_settings: {
      default_payment_method: data.id,
    },
  });
}

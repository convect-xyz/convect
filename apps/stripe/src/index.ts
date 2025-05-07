import { Context, EventBridgeEvent, SQSEvent } from "aws-lambda";
import { Stripe } from "stripe";
import { handleCheckoutSessionComplete } from "./handlers/checkout_session_completed";
import { handleInvoicePaymentFailed } from "./handlers/invoice_payment_failed";
import { handleInvoicePaymentSucceeded } from "./handlers/invoice_payment_succeeded";
import { handlePaymentMethodAttached } from "./handlers/payment_method_attached";
import { handleSubscriptionCreated } from "./handlers/subscription_created";

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
    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event);
      break;
    case "invoice.payment_succeeded":
      await handleInvoicePaymentSucceeded(event);
      break;
    case "payment_method.attached":
      await handlePaymentMethodAttached(event);
      break;
    case "customer.subscription.created":
      await handleSubscriptionCreated(event);
      break;
    default:
    // Unhandled event type
  }
}

import "./sentry/instrumentation";

import { startSpan } from "@sentry/node";
import { Context, EventBridgeEvent, SQSEvent } from "aws-lambda";
import { Stripe } from "stripe";
import { handleCheckoutSessionComplete } from "./handlers/checkout_session_completed";
import { handleInvoicePaymentFailed } from "./handlers/invoice_payment_failed";
import { handleInvoicePaymentSucceeded } from "./handlers/invoice_payment_succeeded";
import { handlePaymentMethodAttached } from "./handlers/payment_method_attached";
import { handleSubscriptionCreatedOrUpdated } from "./handlers/subscription_created_or_updated";
import { handleSubscriptionDeleted } from "./handlers/subscription_deleted";

function span(name: string, fn: () => Promise<any>) {
  return startSpan({ name }, async (_) => {
    return await fn();
  });
}

export const handler = async (event: SQSEvent, context: Context) => {
  const stripeEvents = event.Records.map((record) => {
    return JSON.parse(record.body) as EventBridgeEvent<string, Stripe.Event>;
  });

  for (const stripeEvent of stripeEvents) {
    await processStripeEvent(stripeEvent.detail);
  }

  return {};
};

async function processStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
      await span("checkout.session.completed", () =>
        handleCheckoutSessionComplete(event)
      );
      break;
    case "invoice.payment_failed":
      await span("invoice.payment_failed", () =>
        handleInvoicePaymentFailed(event)
      );
      break;
    case "invoice.payment_succeeded":
      await span("invoice.payment_succeeded", () =>
        handleInvoicePaymentSucceeded(event)
      );
      break;
    case "payment_method.attached":
      await span("payment_method.attached", () =>
        handlePaymentMethodAttached(event)
      );
      break;
    case "customer.subscription.created":
      await span("customer.subscription.created", () =>
        handleSubscriptionCreatedOrUpdated(event)
      );
      break;
    case "customer.subscription.updated":
      await span("customer.subscription.updated", () =>
        handleSubscriptionCreatedOrUpdated(event)
      );
      break;
    case "customer.subscription.deleted":
      await span("customer.subscription.deleted", () =>
        handleSubscriptionDeleted(event)
      );
      break;
    default:
    // Unhandled event type
  }
}

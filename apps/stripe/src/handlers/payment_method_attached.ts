import Stripe from "stripe";
import { stripe } from "~/stripe";

export async function handlePaymentMethodAttached(
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

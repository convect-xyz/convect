import { schema } from "@convect-xyz/lib";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { Stripe } from "stripe";
import { env } from "~/env";
import { db } from "~/server/db";

const stripe = new Stripe(env.STRIPE_API_KEY);
const WEBHOOK_SECRET =
  "REDACTED";

export const POST = async (req: NextRequest) => {
  const { data: event, err } = await parseBody(req);
  if (err) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }

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
    default:
    // Unhandled event type
  }

  return NextResponse.json({});
};

async function parseBody(req: NextRequest) {
  const signature = req.headers.get("stripe-signature")!;
  try {
    return {
      data: stripe.webhooks.constructEvent(
        await req.text(),
        signature,
        WEBHOOK_SECRET,
      ),
      err: undefined,
    };
  } catch (e: any) {
    return { data: undefined, err: e as Error };
  }
}

async function handleCheckoutSessionComplete(
  event: Extract<Stripe.Event, { type: "checkout.session.completed" }>,
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
    .update(schema.users)
    .set({
      stripeCustomerId: customerId,
      planType,
    })
    .where(eq(schema.users.id, client_reference_id!));
}

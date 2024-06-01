import { schema } from "@kayakthedev/lib";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { Stripe } from "stripe";
import { db } from "~/server/db";

const stripe = new Stripe(
  "sk_test_51PMr2V2LJct0ubJ3nTq8p9kTNpPCBHcvzv8RMWmLHdYLFKgo8wMnNUu5bX7Zya2DmyopOsfqxpIosTXKHcYRe7Wl00ey4kK1D8",
);
const WEBHOOK_SECRET =
  "whsec_b223309ef82e681b289f065d682048678b0758c995b18c7770e1d3a48923d3e4";

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

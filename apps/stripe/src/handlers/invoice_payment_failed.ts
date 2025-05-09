import { InvoiceOverdueTemplate } from "@convect-xyz/components/emails";
import { secondsToMilliseconds } from "date-fns";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "~/db";
import schema from "~/db/schema";
import { sendNoReply } from "~/resend";

export async function handleInvoicePaymentFailed(
  event: Extract<Stripe.Event, { type: "invoice.payment_failed" }>
) {
  const data = event.data.object;

  const customerId =
    typeof data.customer === "string" ? data.customer : data.customer?.id;
  if (!customerId) {
    throw new Error("No Customer ID");
  }

  const project = await db.query.projects.findFirst({
    where: (fields, { eq }) => eq(fields.stripeCustomerId, customerId),
    with: {
      user: true,
    },
  });
  if (!project) {
    throw new Error("No Project");
  }

  await db
    .update(schema.projects)
    .set({
      billingStatus: "OVERDUE",
      billingStatusUpdatedAt: new Date(secondsToMilliseconds(event.created)),
    })
    .where(eq(schema.projects.stripeCustomerId, customerId));

  await sendNoReply({
    subject: "Your Convect payment has failed",
    to: project.user.email,
    react: InvoiceOverdueTemplate({
      project: {
        id: project.id,
        name: project.name,
      },
      amount: {
        value: data.amount_due,
        currency: data.currency,
      },
    }),
  }).catch((err) => {
    console.error(err);
  });
}

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

  await Promise.all([
    updateProject(project.id, {
      billingStatus: "OVERDUE",
      billingStatusUpdatedAt: new Date(secondsToMilliseconds(event.created)),
    }),
    sendEmail({
      project,
      amount: {
        value: data.amount_due,
        currency: data.currency,
      },
    }),
  ]);
}

function updateProject(
  projectId: number,
  data: {
    billingStatus: "OVERDUE";
    billingStatusUpdatedAt: Date;
  }
) {
  return db
    .update(schema.projects)
    .set(data)
    .where(eq(schema.projects.id, projectId));
}

function sendEmail(data: {
  project: {
    id: number;
    name: string;
    user: {
      email: string;
    };
  };
  amount: {
    value: number;
    currency: string;
  };
}) {
  return sendNoReply({
    subject: "Your Convect payment has failed",
    to: data.project.user.email,
    react: InvoiceOverdueTemplate({
      project: {
        id: data.project.id,
        name: data.project.name,
      },
      amount: {
        value: data.amount.value,
        currency: data.amount.currency,
      },
    }),
  }).catch((err) => {
    console.error(err);
  });
}

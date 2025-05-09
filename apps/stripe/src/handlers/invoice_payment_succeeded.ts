import { InvoicePaidTemplate } from "@convect-xyz/components/emails";
import { secondsToMilliseconds } from "date-fns";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "~/db";
import schema from "~/db/schema";
import { sendNoReply } from "~/resend";

export async function handleInvoicePaymentSucceeded(
  event: Extract<Stripe.Event, { type: "invoice.payment_succeeded" }>
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
      billingStatus: "ACTIVE",
      billingStatusUpdatedAt: new Date(secondsToMilliseconds(event.created)),
    }),
    sendEmail({
      project: {
        id: project.id,
        name: project.name,
        user: {
          email: project.user.email,
        },
      },
      amount: {
        value: data.amount_paid,
        currency: data.currency,
      },
      invoice: {
        url: data.invoice_pdf,
      },
    }),
  ]);
}

async function updateProject(
  projectId: number,
  data: {
    billingStatus: "ACTIVE";
    billingStatusUpdatedAt: Date;
  }
) {
  return db
    .update(schema.projects)
    .set(data)
    .where(eq(schema.projects.id, projectId));
}

async function sendEmail(data: {
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
  invoice: {
    url: string | null | undefined;
  };
}) {
  return sendNoReply({
    subject: "Your Convect payment has failed",
    to: data.project.user.email,
    react: InvoicePaidTemplate({
      project: {
        id: data.project.id,
        name: data.project.name,
      },
      amount: {
        value: data.amount.value,
        currency: data.amount.currency,
      },
    }),
    attachments: data.invoice.url
      ? [
          {
            filename: "convect_invoice.pdf",
            content: data.invoice.url,
          },
        ]
      : undefined,
  }).catch((err) => {
    console.error(err);
  });
}

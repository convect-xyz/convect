import { SubscriptionCancelledTemplate } from "@convect-xyz/components/emails";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "~/db";
import schema from "~/db/schema";
import { sendNoReply } from "~/resend";

export async function handleSubscriptionDeleted(
  event: Extract<Stripe.Event, { type: "customer.subscription.deleted" }>
) {
  const data = event.data.object;

  const stripeCustomerId =
    typeof data.customer === "string" ? data.customer : data.customer.id;

  const project = await db.query.projects.findFirst({
    where: (fields, { eq }) => eq(fields.stripeCustomerId, stripeCustomerId),
    with: {
      user: true,
    },
  });
  if (!project) {
    throw new Error("Project not found");
  }

  await db
    .update(schema.projects)
    .set({
      planType: "BASE",
    })
    .where(eq(schema.projects.stripeCustomerId, stripeCustomerId))
    .returning({ stripeSubscriptionId: schema.projects.stripeSubscriptionId })
    .then((c) => c.at(0)!.stripeSubscriptionId!);

  await sendEmail({
    project: {
      id: project.id,
      name: project.name,
      user: {
        email: project.user.email,
      },
    },
  });
}

async function sendEmail(data: {
  project: {
    id: number;
    name: string;
    user: {
      email: string;
    };
  };
}) {
  return sendNoReply({
    subject: "Your Convect subscription has been cancelled.",
    to: data.project.user.email,
    react: SubscriptionCancelledTemplate({
      project: {
        id: data.project.id,
        name: data.project.name,
      },
    }),
  }).catch((err) => {
    console.error(err);
  });
}

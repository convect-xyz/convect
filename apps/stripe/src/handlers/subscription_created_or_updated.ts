import { SubscriptionChangedTemplate } from "@convect-xyz/components/emails";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "~/db";
import schema from "~/db/schema";
import { sendNoReply } from "~/resend";

export async function handleSubscriptionCreatedOrUpdated(
  event:
    | Extract<Stripe.Event, { type: "customer.subscription.created" }>
    | Extract<Stripe.Event, { type: "customer.subscription.updated" }>
) {
  const data = event.data.object;
  const planType = data.metadata.planType;
  if (!planType) {
    throw new Error("Plan type not found in metadata for subscription");
  }

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
      planType: planType as any,
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
    subject: "Your Convect subscription has been updated.",
    to: data.project.user.email,
    react: SubscriptionChangedTemplate({
      project: {
        id: data.project.id,
        name: data.project.name,
      },
    }),
  }).catch((err) => {
    console.error(err);
  });
}

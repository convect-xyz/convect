import { schema } from "@convect-xyz/server";
import { TRPCError } from "@trpc/server";
import { InferSelectModel, eq } from "drizzle-orm";
import { Stripe } from "stripe";
import { z } from "zod";
import { env } from "~/env";
import { planLoader } from "~/lib/server/products";
import { db } from "~/server/db";
import { protectedProcedure } from "~/trpc/trpc";

const stripe = new Stripe(env.STRIPE_API_KEY);

export const switchPlan = protectedProcedure
  .input(
    z.object({
      newPlan: z.enum(["HOBBY", "PRO"]),
      projectId: z.number(),
    }),
  )
  .output(z.object({}))
  .mutation(async ({ ctx, input }) => {
    const project = await ctx.db.query.projects.findFirst({
      where(fields, { eq }) {
        return eq(fields.id, input.projectId);
      },
    });
    if (!project) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const activeSubscription = project.stripeSubscriptionId
      ? await stripe.subscriptions.retrieve(project.stripeSubscriptionId)
      : null;

    const stripeCustomerId = await getStripeCustomerId(project);

    await (activeSubscription
      ? updateSubscription(input.newPlan, activeSubscription)
      : createSubscription(input.newPlan, stripeCustomerId));

    return {};
  });

async function createSubscription(
  planType: "HOBBY" | "PRO",
  stripeCustomerId: string,
) {
  const subscription = await stripe.subscriptions.create({
    customer: stripeCustomerId,
    items: await getSubscriptionItemsForPlan(planType),
    metadata: {
      planType,
    },
  });

  await db
    .update(schema.projects)
    .set({
      stripeSubscriptionId: subscription.id,
    })
    .where(eq(schema.projects.stripeCustomerId, stripeCustomerId))
    .returning({ stripeSubscriptionId: schema.projects.stripeSubscriptionId })
    .then((c) => c.at(0)!.stripeSubscriptionId!);

  return subscription;
}

async function updateSubscription(
  planType: "HOBBY" | "PRO",
  activeSubscription: Stripe.Subscription,
) {
  const previousSubscriptionItems = () => {
    return activeSubscription.items.data.map((item) => {
      return {
        id: item.id,
        deleted: true,
      };
    });
  };

  return stripe.subscriptions.update(activeSubscription.id, {
    items: [
      ...previousSubscriptionItems(),
      ...(await getSubscriptionItemsForPlan(planType)),
    ],
    metadata: {
      planType,
    },
  });
}

const getSubscriptionItemsForPlan = async (planType: "HOBBY" | "PRO") => {
  const plan = await planLoader.loadForIdentifier(planType);

  return plan.products.map((product) => {
    return {
      price: product.stripePriceId,
    };
  });
};

export const getStripeCustomerId = async (
  projects: InferSelectModel<typeof schema.projects>,
) => {
  if (projects.stripeCustomerId) {
    return projects.stripeCustomerId;
  }

  const createdCustomerId = await stripe.customers.create().then((c) => c.id);

  return db.transaction(async (tx) => {
    const existingProject = await tx.query.projects
      .findFirst({
        where(fields, { eq }) {
          return eq(fields.id, projects.id);
        },
      })
      .then((u) => u!);

    if (existingProject.stripeCustomerId) {
      return existingProject.stripeCustomerId;
    }

    return await tx
      .update(schema.projects)
      .set({
        stripeCustomerId: createdCustomerId,
      })
      .where(eq(schema.projects.id, existingProject.id))
      .returning({ stripeCustomerId: schema.projects.stripeCustomerId })
      .then((c) => c.at(0)!.stripeCustomerId!);
  });
};

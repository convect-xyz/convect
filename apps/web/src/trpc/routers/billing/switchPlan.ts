import { schema } from "@convect-xyz/lib";
import { TRPCError } from "@trpc/server";
import { InferSelectModel, eq } from "drizzle-orm";
import { Stripe } from "stripe";
import { z } from "zod";
import { env } from "~/env";
import { hobbyPlan, proPlan } from "~/lib/server/plan";
import { db } from "~/server/db";
import { protectedProcedure } from "~/trpc/trpc";

const stripe = new Stripe(env.STRIPE_API_KEY);

function getPlan(plan: schema.PlanType) {
  switch (plan) {
    case "HOBBY":
      return hobbyPlan;
    case "PRO":
      return proPlan;
    default:
      throw new Error("Invalid plan");
  }
}

export const switchPlan = protectedProcedure
  .input(
    z.object({
      newPlan: z.enum(schema.planEnum.enumValues),
    }),
  )
  .output(z.object({}))
  .mutation(async ({ ctx, input }) => {
    const user = await ctx.db.query.users.findFirst({
      where(fields, { eq }) {
        return eq(fields.id, ctx.session.user.id);
      },
    });
    if (!user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const activeSubscription = user.stripeSubscriptionId
      ? await stripe.subscriptions.retrieve(user.stripeSubscriptionId)
      : null;

    const stripeCustomerId = await getStripeCustomerId(user!);
    await (activeSubscription
      ? updateSubscription(activeSubscription, input.newPlan)
      : createSubscription(stripeCustomerId, input.newPlan));

    await db
      .update(schema.users)
      .set({
        planType: input.newPlan,
      })
      .where(eq(schema.users.stripeCustomerId, stripeCustomerId))
      .returning({ stripeSubscriptionId: schema.users.stripeSubscriptionId })
      .then((c) => c.at(0)!.stripeSubscriptionId!);

    return {};
  });

async function createSubscription(
  stripeCustomerId: string,
  plan: schema.PlanType,
) {
  const subscription = await stripe.subscriptions.create({
    customer: stripeCustomerId,
    items: getSubscriptionItemsForPlan(plan),
  });

  await db
    .update(schema.users)
    .set({
      stripeSubscriptionId: subscription.id,
    })
    .where(eq(schema.users.stripeCustomerId, stripeCustomerId))
    .returning({ stripeSubscriptionId: schema.users.stripeSubscriptionId })
    .then((c) => c.at(0)!.stripeSubscriptionId!);

  return subscription;
}

function updateSubscription(
  activeSubscription: Stripe.Subscription,
  newPlan: schema.PlanType,
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
      ...getSubscriptionItemsForPlan(newPlan),
    ],
  });
}

const getSubscriptionItemsForPlan = (plan: schema.PlanType) => {
  return getPlan(plan).products.map((product) => {
    return {
      price: product.getStripePriceId(plan),
    };
  });
};

export const getStripeCustomerId = async (
  user: InferSelectModel<typeof schema.users>,
) => {
  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  const createdCustomerId = await stripe.customers.create().then((c) => c.id);

  return await db.transaction(async (tx) => {
    const existingUser = await tx.query.users
      .findFirst({
        where(fields, { eq }) {
          return eq(fields.id, user.id);
        },
      })
      .then((u) => u!);

    if (existingUser.stripeCustomerId) {
      return existingUser.stripeCustomerId;
    }

    return await tx
      .update(schema.users)
      .set({
        stripeCustomerId: createdCustomerId,
      })
      .where(eq(schema.users.id, existingUser.id))
      .returning({ stripeCustomerId: schema.users.stripeCustomerId })
      .then((c) => c.at(0)!.stripeCustomerId!);
  });
};

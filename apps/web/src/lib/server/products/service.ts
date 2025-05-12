import "server-only";

import { schema } from "@convect-xyz/server";
import { eq, InferSelectModel } from "drizzle-orm";
import Stripe from "stripe";
import { z } from "zod";
import { db } from "~/server/db";
import { stripe } from "../stripe";
import { ExtendedPricing, planLoader, planSchema, xPlanSchema } from "./loader";

async function createSubscription(
  planType: "HOBBY" | "PRO" | "ENTERPRISE",
  plan: z.infer<typeof planSchema>,
  stripeCustomerId: string,
  options?: {
    backdateStartDateSecs?: number;
    billingCycleAnchorSecs?: number;
  },
) {
  const subscription = await stripe.subscriptions.create({
    customer: stripeCustomerId,
    items: getSubscriptionItemsForPlan(plan),
    metadata: {
      planType,
    },
    ...(options?.backdateStartDateSecs && {
      backdate_start_date: options.backdateStartDateSecs,
    }),
    ...(options?.billingCycleAnchorSecs && {
      billing_cycle_anchor: options.billingCycleAnchorSecs,
    }),
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
  planType: "HOBBY" | "PRO" | "ENTERPRISE",
  plan: z.infer<typeof planSchema>,
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
      ...getSubscriptionItemsForPlan(plan),
    ],
    metadata: {
      planType,
    },
  });
}

const getSubscriptionItemsForPlan = (plan: z.infer<typeof planSchema>) => {
  return plan.pricing.map((price) => {
    return {
      price: price.stripePriceId,
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

async function createStripePrice(product: ExtendedPricing) {
  const price = product.price;
  if (price._type === "fixed") {
    return stripe.prices.create({
      currency: "USD",
      recurring: {
        interval: "month",
      },
      tax_behavior: "inclusive",
      product: product.product.stripeProductId,
      unit_amount_decimal: price.priceInCents,
    });
  }

  return stripe.prices.create({
    currency: "USD",
    recurring: {
      interval: "month",
      usage_type: "metered",
      meter:
        product.product.billing._type === "tiered"
          ? product.product.billing.stripeMeterId
          : undefined,
    },
    billing_scheme: "tiered",
    tax_behavior: "inclusive",
    tiers: [
      {
        up_to: price.includedFree,
        unit_amount: 0,
      },
      {
        up_to: "inf",
        unit_amount_decimal: price.priceInCentsPerAdditionalUnit,
      },
    ],
    tiers_mode: "volume",
    product: product.product.stripeProductId,
  });
}

class PlanService {
  async saveCustomPlan(
    project: InferSelectModel<typeof schema.projects>,
    _plan: z.infer<typeof planSchema>,
  ) {
    const plan = xPlanSchema.parse(_plan);
    for (const product of plan.pricing) {
      product.stripePriceId = await createStripePrice(product).then(
        (p) => p.id,
      );
    }

    await db
      .update(schema.projects)
      .set({ plan })
      .where(eq(schema.projects.id, project.id));
  }

  async switchPlan(
    project: InferSelectModel<typeof schema.projects>,
    newPlan: "HOBBY" | "PRO" | "ENTERPRISE",
    options?: {
      create?: {
        backdateStartDateSecs?: number;
        billingCycleAnchorSecs?: number;
      };
    },
  ) {
    const plan =
      newPlan === "ENTERPRISE"
        ? await planLoader.customPlanByProjectId(project.id)
        : await planLoader.byPlanType(newPlan);

    const activeSubscription = project.stripeSubscriptionId
      ? await stripe.subscriptions.retrieve(project.stripeSubscriptionId)
      : null;
    const stripeCustomerId = await getStripeCustomerId(project);

    if (activeSubscription) {
      await updateSubscription(newPlan, plan, activeSubscription);
    } else {
      await createSubscription(
        newPlan,
        plan,
        stripeCustomerId,
        options?.create,
      );
    }

    await db
      .update(schema.projects)
      .set({
        planType: newPlan,
      })
      .where(eq(schema.projects.id, project.id));
  }

  async cancelSubscription(project: InferSelectModel<typeof schema.projects>) {
    if (!project.stripeSubscriptionId) {
      return;
    }

    await stripe.subscriptions.cancel(project.stripeSubscriptionId);
  }
}

export const planService = new PlanService();

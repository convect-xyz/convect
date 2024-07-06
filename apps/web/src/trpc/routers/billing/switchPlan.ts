import { schema } from "@convect-xyz/lib";
import { InferSelectModel, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { Stripe } from "stripe";
import { z } from "zod";
import { env } from "~/env";
import { db } from "~/server/db";
import { protectedProcedure } from "~/trpc/trpc";

const stripe = new Stripe(env.STRIPE_API_KEY);

function getLineItems(plan: "FREE" | "STARTUP" | "PROFESSIONAL") {
  switch (plan) {
    case "FREE":
      return [
        {
          price: "price_1PMrEC2LJct0ubJ3S15CW6RC",
          quantity: 1,
        },
      ];
    case "STARTUP":
      return [
        {
          price: "price_1PMrJE2LJct0ubJ3Vf10A9s9",
          quantity: 1,
        },
        {
          price: "price_1PMsgD2LJct0ubJ3osCAyhcG",
        },
      ];
  }
}

export const switchPlan = protectedProcedure
  .input(
    z.object({
      newPlan: z.enum(["FREE", "STARTUP", "PROFESSIONAL"]),
    }),
  )
  .output(
    z.object({
      url: z.string(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const user = await ctx.db.query.users.findFirst({
      where(fields, { eq }) {
        return eq(fields.id, ctx.session.user.id);
      },
    });

    const headersList = headers();

    const stripeCustomerId = await getStripeCustomerId(user!);
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      client_reference_id: ctx.session.user.id,
      mode: "subscription",
      line_items: getLineItems(input.newPlan),
      subscription_data: {
        metadata: {
          userId: ctx.session.user.id,
          plan: input.newPlan,
        },
      },
      success_url: `${headersList.get(
        "host",
      )}/projects?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${headersList.get("host")}/projects`,
    });

    return {
      url: session.url!,
    };
  });

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

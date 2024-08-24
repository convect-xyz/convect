import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { stripe } from "~/lib/server/stripe";
import { protectedProcedure } from "~/trpc/trpc";
import { getStripeCustomerId } from "../billing/switchPlan";

export const getStripeSetupIntent = protectedProcedure
  .input(z.object({}))
  .output(
    z.object({
      clientSecret: z.string(),
    }),
  )
  .query(async ({ ctx, input }) => {
    const user = await ctx.db.query.users.findFirst({
      where(fields, { eq }) {
        return eq(fields.id, ctx.session.user.id);
      },
    });

    const stripeCustomerId = await getStripeCustomerId(user!);

    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ["card"],
      usage: "off_session",
    });

    if (!setupIntent.client_secret) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create setup intent",
      });
    }

    return {
      clientSecret: setupIntent.client_secret,
    };
  });

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { stripe } from "~/lib/server/stripe";
import { protectedProcedure } from "~/trpc/trpc";
import { getStripeCustomerId } from "../billing/switchPlan";

export const getStripeSetupIntent = protectedProcedure
  .input(
    z.object({
      projectId: z.number(),
    }),
  )
  .output(
    z.object({
      clientSecret: z.string(),
    }),
  )
  .query(async ({ ctx, input }) => {
    const project = await ctx.db.query.projects.findFirst({
      where(fields, { eq }) {
        return eq(fields.id, input.projectId);
      },
    });

    const stripeCustomerId = await getStripeCustomerId(project!);
    const existingPaymentMethods = await stripe.paymentMethods.list({
      customer: stripeCustomerId,
    });

    if (existingPaymentMethods.data.length >= 3) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "User already has 3 payment methods",
      });
    }

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

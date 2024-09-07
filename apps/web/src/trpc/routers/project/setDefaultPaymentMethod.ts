import { z } from "zod";
import { stripe } from "~/lib/server/stripe";
import { protectedProcedure } from "~/trpc/trpc";
import { getStripeCustomerId } from "../billing/switchPlan";

export const setDefaultPaymentMethod = protectedProcedure
  .input(
    z.object({
      paymentMethodId: z.string(),
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

    const stripeCustomerId = await getStripeCustomerId(project!);

    const setupIntent = await stripe.customers.update(stripeCustomerId, {
      invoice_settings: {
        default_payment_method: input.paymentMethodId,
      },
    });

    return {};
  });

import { z } from "zod";
import { stripe } from "~/lib/server/stripe";
import { protectedProcedure } from "~/trpc/trpc";
import { getStripeCustomerId } from "../billing/switchPlan";

export const setDefaultPaymentMethod = protectedProcedure
  .input(
    z.object({
      paymentMethodId: z.string(),
    }),
  )
  .output(z.object({}))
  .mutation(async ({ ctx, input }) => {
    const user = await ctx.db.query.users.findFirst({
      where(fields, { eq }) {
        return eq(fields.id, ctx.session.user.id);
      },
    });

    const stripeCustomerId = await getStripeCustomerId(user!);

    const setupIntent = await stripe.customers.update(stripeCustomerId, {
      invoice_settings: {
        default_payment_method: input.paymentMethodId,
      },
    });

    return {};
  });

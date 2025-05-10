import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getStripeCustomerId } from "~/lib/server/products";
import { stripe } from "~/lib/server/stripe";
import { protectedProcedure } from "~/trpc/trpc";

export const getPaymentMethods = protectedProcedure
  .input(
    z.object({
      projectId: z.number(),
    }),
  )
  .output(
    z.array(
      z.object({
        id: z.string(),
        brand: z.string(),
        last4: z.string(),
        exp_month: z.number(),
        exp_year: z.number(),
        funding: z.string(),
        default: z.boolean(),
      }),
    ),
  )
  .query(async ({ ctx, input }) => {
    const project = await ctx.db.query.projects.findFirst({
      where(fields, { eq }) {
        return eq(fields.id, input.projectId);
      },
    });
    if (!project) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const stripeCustomerId = await getStripeCustomerId(project!);

    const [customer, paymentMethods] = await Promise.all([
      stripe.customers.retrieve(stripeCustomerId),
      stripe.paymentMethods.list({
        type: "card",
        limit: 3,
        customer: stripeCustomerId,
      }),
    ]);

    if (customer.deleted) {
      return [];
    }
    return paymentMethods.data
      .map((paymentMethod) => ({
        id: paymentMethod.id,
        brand: paymentMethod.card!.brand,
        last4: paymentMethod.card!.last4,
        exp_month: paymentMethod.card!.exp_month,
        exp_year: paymentMethod.card!.exp_year,
        funding: paymentMethod.card!.funding,
        default:
          customer.invoice_settings.default_payment_method === paymentMethod.id,
      }))
      .sort((a, b) => (a.default ? -1 : b.default ? 1 : 0));
  });

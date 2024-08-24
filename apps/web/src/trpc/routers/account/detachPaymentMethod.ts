import { z } from "zod";
import { stripe } from "~/lib/server/stripe";
import { protectedProcedure } from "~/trpc/trpc";

export const detachPaymentMethod = protectedProcedure
  .input(
    z.object({
      paymentMethodId: z.string(),
    }),
  )
  .output(z.object({}))
  .mutation(async ({ input }) => {
    await stripe.paymentMethods.detach(input.paymentMethodId);

    return {};
  });

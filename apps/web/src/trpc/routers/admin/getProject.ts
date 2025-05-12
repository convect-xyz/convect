import Stripe from "stripe";
import { z } from "zod";
import {
  getDefaultPricing,
  planLoader,
  planSchema,
  productMetadata,
} from "~/lib/server/products";
import { stripe } from "~/lib/server/stripe";
import { adminProcedure } from "~/trpc/trpc";

export const getProject = adminProcedure
  .input(
    z.object({
      projectId: z.number(),
    }),
  )
  .output(
    z.object({
      id: z.number(),
      name: z.string(),
      stripeSubscription: z.custom<Stripe.Subscription>().nullable(),
      planType: z.enum(["FREE", "HOBBY", "PRO", "ENTERPRISE"]),
      plan: planSchema.transform((data) => {
        return {
          ...data,
          pricing: Object.values(productMetadata).map((product) => {
            const getPricing = () => {
              const pricing = data.pricing.find((p) => p.key === product.key);
              if (pricing) {
                return pricing;
              }

              return getDefaultPricing(product.key);
            };

            return {
              ...getPricing(),
              product,
            };
          }),
        };
      }),
    }),
  )
  .query(async ({ ctx, input }) => {
    const project = await ctx.db.query.projects.findFirst({
      where: (fields, { eq }) => eq(fields.id, input.projectId),
    });

    if (!project) {
      throw new Error("Project not found");
    }

    const plan = await planLoader.byProject(project);

    const stripeSubscription = project.stripeSubscriptionId
      ? await stripe.subscriptions.retrieve(project.stripeSubscriptionId)
      : null;

    return {
      id: project.id,
      name: project.name,
      planType: project.planType,
      plan,
      stripeSubscription,
    };
  });

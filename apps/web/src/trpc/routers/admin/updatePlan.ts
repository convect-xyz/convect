import { z } from "zod";
import { availableProducts, planService } from "~/lib/server/products";
import { adminProcedure } from "~/trpc/trpc";

export const updatePlan = adminProcedure
  .input(
    z.object({
      projectId: z.number(),
      backdateStartDateSecs: z.number().optional(),
      billingCycleAnchorSecs: z.number().optional(),
      prices: z.array(
        z.object({
          key: z
            .string()
            .transform(
              (key) => availableProducts[key as keyof typeof availableProducts],
            ),
          price: z
            .object({
              _type: z.literal("tiered"),
              includedFree: z.number(),
              priceInCentsPerAdditionalUnit: z.string(),
            })
            .or(
              z.object({
                _type: z.literal("fixed"),
                priceInCents: z.string(),
              }),
            ),
        }),
      ),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const project = await ctx.db.query.projects.findFirst({
      where: (fields, { eq }) => eq(fields.id, input.projectId),
    });
    if (!project) {
      throw new Error("Project not found");
    }

    const prices = input.prices.map((p) => ({
      ...p,
      stripePriceId: "",
    }));

    await planService.saveCustomPlan(project, {
      id: "custom",
      pricing: prices,
    });

    await planService.switchPlan(project, "ENTERPRISE", {
      create: {
        backdateStartDateSecs: input.backdateStartDateSecs,
        billingCycleAnchorSecs: input.billingCycleAnchorSecs,
      },
    });
  });

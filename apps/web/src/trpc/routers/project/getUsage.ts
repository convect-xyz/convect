import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  availableProducts,
  ExtendedPricing,
  planLoader,
} from "~/lib/server/products";
import { usage, UsageFn } from "~/lib/server/products/usage";
import { protectedProcedure } from "~/trpc/trpc";

export const getUsage = protectedProcedure
  .input(
    z.object({
      projectId: z.number(),
      periodStart: z.number(),
      periodEnd: z.number(),
    }),
  )
  .output(
    z.array(
      z.object({
        key: z.nativeEnum(availableProducts),
        name: z.string(),
        totalUsage: z.number(),
        includedFree: z.number(),
        additionalChargeInCents: z.number(),
        includedFreeUsageAsFraction: z.number(),
        unitSymbol: z.string(),
      }),
    ),
  )
  .query(async ({ ctx, input }) => {
    const { periodStart, periodEnd } = input;

    const project = await ctx.db.query.projects.findFirst({
      where(fields, { eq }) {
        return eq(fields.id, input.projectId);
      },
    });
    if (!project) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const execute = async (fn: UsageFn) => {
      return fn({
        projectId: project.id,
        periodStart,
        periodEnd,
      });
    };

    const results = await Promise.all([
      execute(usage.convectFunctions),
      execute(usage.processedTransactions),
      execute(usage.gbHours),
      execute(usage.invocations),
    ]);

    const getResponseForProduct = (
      pricing: ExtendedPricing,
      totalUsage: number,
    ) => {
      return {
        key: pricing.key,
        name: pricing.product.name,
        totalUsage,
        includedFree:
          pricing.price._type === "tiered" ? pricing.price.includedFree : 0,
        additionalChargeInCents:
          pricing.price._type === "tiered"
            ? pricing.price.getAdditionalChargeInCents(totalUsage)
            : 0,
        includedFreeUsageAsFraction:
          pricing.price._type === "tiered"
            ? pricing.price.getIncludedFreeUsageAsFraction(totalUsage)
            : 0,
        unitSymbol: pricing.product.unitSymbol,
      };
    };

    console.log(results);
    const plan = await planLoader.byProject(project);
    return results
      .map((usage) => {
        const product = plan.pricing.find((p) => p.key === usage.key)!;
        return getResponseForProduct(product, usage.usage);
      })
      .sort((a, b) => b.additionalChargeInCents - a.additionalChargeInCents);
  });

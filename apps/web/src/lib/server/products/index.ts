import "server-only";

import { schema } from "@convect-xyz/lib";
import { InferSelectModel } from "drizzle-orm";
import { z } from "zod";
import { env } from "~/env";

export const availebleProducts = {
  processedTransactions: "processedTransactions",
  gbHours: "gbHours",
  invocations: "invocations",
  basePlan: "basePlan",
} as const;

const planSchema = z
  .object({
    id: z.string(),
    products: z.array(
      z.object({
        key: z.nativeEnum(availebleProducts),
        name: z.string(),
        includedFree: z.number(),
        priceInCentsPerAdditionalUnit: z.number(),
        unitSize: z.number(),
        unitSymbol: z.string(),
        stripePriceId: z.string(),
      }),
    ),
  })
  .refine((data) => {
    return Object.values(availebleProducts).every((key) =>
      data.products.some((p) => p.key === key),
    );
  })
  .transform((data) => {
    return {
      ...data,
      products: data.products.map((product) => {
        const getAdditionalChargeInCents = (totalUsage: number) => {
          const includedFree = product.includedFree;
          if (totalUsage < includedFree) {
            return 0;
          }

          const overusage = totalUsage - includedFree;

          return (
            (overusage * product.priceInCentsPerAdditionalUnit) /
            product.unitSize
          );
        };

        const getIncludedFreeUsageAsFraction = (totalUsage: number) => {
          return Math.min(totalUsage / product.includedFree, 1);
        };

        return {
          ...product,
          getAdditionalChargeInCents,
          getIncludedFreeUsageAsFraction,
        };
      }),
    };
  });

export type Plan = z.infer<typeof planSchema>;
export type Product = Plan["products"][number];

class PlanLoader {
  private async load(
    plan: "HOBBY" | "PRO",
  ): Promise<z.infer<typeof planSchema>> {
    if (plan === "HOBBY") {
      const pricing = require(
        `./pricing/pricing.hobby.${env.PLAN_ENVIRONMENT}.json`,
      );
      return planSchema.parse(pricing);
    }

    if (plan === "PRO") {
      const pricing = require(
        `./pricing/pricing.pro.${env.PLAN_ENVIRONMENT}.json`,
      );
      return planSchema.parse(pricing);
    }

    throw new Error("Invalid plan: " + plan);
  }

  private async loadFromUrl(url: string): Promise<z.infer<typeof planSchema>> {
    const response = await fetch(url);
    const pricing = await response.json();
    return planSchema.parse(pricing);
  }

  async loadForUser(
    user: InferSelectModel<typeof schema.users>,
  ): Promise<z.infer<typeof planSchema>> {
    if (user.planType === "HOBBY") {
      return this.load("HOBBY");
    }

    if (user.planType === "PRO") {
      return this.load("PRO");
    }

    return this.loadFromUrl("https://convect.xyz");
  }
}

export const planLoader = new PlanLoader();

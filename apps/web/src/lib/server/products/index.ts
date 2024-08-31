import "server-only";

import { schema } from "@convect-xyz/lib";
import { InferSelectModel } from "drizzle-orm";
import { z } from "zod";
import { env } from "~/env";
import { loadFromPath } from "./utils";

export const availebleProducts = {
  processedTransactions: "processedTransactions",
  gbHours: "gbHours",
  invocations: "invocations",
  basePlan: "basePlan",
} as const;

type ProductMetadata = {
  key: string;
  name: string;
  unitSymbol: string;
  unitSize: number;
};

export const productMetadata: Record<
  keyof typeof availebleProducts,
  ProductMetadata
> = {
  processedTransactions: {
    key: "processedTransactions",
    name: "Processed Transactions",
    unitSymbol: "Txs",
    unitSize: 100000,
  },
  gbHours: {
    key: "gbHours",
    name: "GB Hours",
    unitSymbol: "GB-Hours",
    unitSize: 1,
  },
  invocations: {
    key: "invocations",
    name: "Invocations",
    unitSymbol: "",
    unitSize: 1000000,
  },
  basePlan: {
    key: "basePlan",
    name: "Base Plan",
    unitSymbol: "",
    unitSize: 1,
  },
};

const planSchema = z
  .object({
    id: z.string(),
    products: z.array(
      z.object({
        key: z.nativeEnum(availebleProducts),
        name: z.string().optional(),
        includedFree: z.number(),
        priceInCentsPerAdditionalUnit: z.number(),
        unitSize: z.number().optional(),
        unitSymbol: z.string().optional(),
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
      products: data.products.map((jsonProduct) => {
        const product = {
          ...productMetadata[jsonProduct.key],
          ...jsonProduct,
        };

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

  async loadForUser(
    user: InferSelectModel<typeof schema.users>,
  ): Promise<z.infer<typeof planSchema>> {
    if (user.planType === "HOBBY") {
      return this.load("HOBBY");
    }

    if (user.planType === "PRO") {
      return this.load("PRO");
    }

    if (!user.planUrl) {
      throw new Error("No plan url found for user");
    }

    return planSchema.parse(await loadFromPath(user.planUrl));
  }
}

export const planLoader = new PlanLoader();

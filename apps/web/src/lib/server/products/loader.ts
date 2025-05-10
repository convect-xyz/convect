import "server-only";

import { schema } from "@convect-xyz/server";
import { InferSelectModel } from "drizzle-orm";
import { z } from "zod";
import { env } from "~/env";
import { db } from "~/server/db";
import { availableProducts, productMetadata } from "./products";

export const planSchema = z.object({
  id: z.string(),
  pricing: z.array(
    z
      .object({
        key: z.nativeEnum(availableProducts),
        stripePriceId: z.string(),
        price: z
          .object({
            _type: z.literal("tiered"),
            includedFree: z.number(),
            priceInCentsPerAdditionalUnit: z
              .number()
              .transform((v) => v.toString())
              .or(z.string()),
          })
          .or(
            z.object({
              _type: z.literal("fixed"),
              priceInCents: z
                .number()
                .transform((v) => v.toString())
                .or(z.string()),
            }),
          ),
      })
      .refine(
        (data) => {
          return productMetadata[data.key] !== undefined;
        },
        {
          message: "Invalid product key",
        },
      ),
  ),
});

export const xPlanSchema = planSchema.transform((data) => {
  return {
    ...data,
    pricing: data.pricing.map((planPrice) => {
      const result = {
        ...planPrice,
        product: productMetadata[planPrice.key],
      };

      const price = planPrice.price;
      if (price._type === "fixed") {
        return {
          ...result,
          price: {
            ...price,
            getPriceInCents: () => price.priceInCents,
          },
        };
      }

      const getAdditionalChargeInCents = (totalUsage: number) => {
        const includedFree = price.includedFree;
        if (totalUsage < includedFree) {
          return 0;
        }

        const overusage = totalUsage - includedFree;

        return overusage * Number(price.priceInCentsPerAdditionalUnit);
      };

      const getIncludedFreeUsageAsFraction = (totalUsage: number) => {
        return Math.min(totalUsage / price.includedFree, 1);
      };

      return {
        ...result,
        price: {
          ...price,
          getAdditionalChargeInCents,
          getIncludedFreeUsageAsFraction,
        },
      };
    }),
  };
});

export type ExtendedPlan = z.infer<typeof xPlanSchema>;
export type ExtendedPricing = ExtendedPlan["pricing"][number];

class PlanLoader {
  async customPlanByProjectId(
    projectId: number,
  ): Promise<z.infer<typeof xPlanSchema>> {
    const project = await db.query.projects.findFirst({
      where: (fields, { eq }) => eq(fields.id, projectId),
    });
    if (!project) {
      throw new Error("Project not found");
    }

    return xPlanSchema.parse(project.plan);
  }

  async byPlanType(
    plan: "HOBBY" | "PRO" | number,
  ): Promise<z.infer<typeof xPlanSchema>> {
    if (plan === "HOBBY") {
      const pricing = require(
        `./pricing/pricing.hobby.${env.PLAN_ENVIRONMENT}.json`,
      );
      return xPlanSchema.parse(pricing);
    }

    if (plan === "PRO") {
      const pricing = require(
        `./pricing/pricing.pro.${env.PLAN_ENVIRONMENT}.json`,
      );
      return xPlanSchema.parse(pricing);
    }

    throw new Error("Invalid plan: " + plan);
  }

  async byProject(
    project: InferSelectModel<typeof schema.projects>,
  ): Promise<z.infer<typeof xPlanSchema>> {
    if (project.planType === "HOBBY") {
      return this.byPlanType("HOBBY");
    }

    if (project.planType === "PRO") {
      return this.byPlanType("PRO");
    }

    return xPlanSchema.parse(project.plan);
  }

  async byProjectId(projectId: number): Promise<z.infer<typeof xPlanSchema>> {
    const project = await db.query.projects.findFirst({
      where: (fields, { eq }) => eq(fields.id, projectId),
    });
    if (!project) {
      throw new Error("Project not found");
    }

    return this.byProject(project);
  }
}

export const planLoader = new PlanLoader();

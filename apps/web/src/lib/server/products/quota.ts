import { InferSelectModel } from "drizzle-orm";
import schema from "~/server/db/schema";
import { ExtendedPlan, ExtendedPricing, planLoader } from "./loader";
import { currentMonthUsage } from "./usage";

class QuotaService {
  async byPlan(productKey: ExtendedPricing["key"], plan: ExtendedPlan) {
    const productData = plan.pricing.find((p) => p.key === productKey);
    if (!productData) {
      throw new Error(`Product ${productKey} not found in plan`);
    }

    if (productData.price._type === "fixed") {
      return -1;
    }

    return productData.price.includedFree;
  }

  async byPlanType(
    productKey: ExtendedPricing["key"],
    planType: "HOBBY" | "PRO",
  ) {
    return this.byPlan(productKey, await planLoader.byPlanType(planType));
  }

  async byProject(
    productKey: ExtendedPricing["key"],
    project: InferSelectModel<typeof schema.projects>,
  ) {
    return this.byPlan(productKey, await planLoader.byProject(project));
  }

  async byProjectId(product: ExtendedPricing["key"], projectId: number) {
    return this.byPlan(product, await planLoader.byProjectId(projectId));
  }

  async remainingQuota(product: ExtendedPricing["key"], projectId: number) {
    const currentUsage = await currentMonthUsage[product](projectId);
    const quota = await this.byProjectId(product, projectId);
    return {
      remaining: quota - currentUsage.usage,
      currentUsage: currentUsage.usage,
      quota,
    };
  }
}

export const quotaService = new QuotaService();

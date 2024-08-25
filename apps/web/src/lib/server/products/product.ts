import { PlanType } from "@convect-xyz/lib/src/db/schema";

type ProductOptions = {
  key: "processedTransactions" | "gbHours" | "invocations" | "basePlan";
  name: string;
  includedFree: Record<PlanType, number>;
  priceInCentsPerAdditionalUnit: number;
  unitSize: number;
  unit: string;
  stripePriceIds: Record<PlanType, string>;
};

export class Product {
  public key: "processedTransactions" | "gbHours" | "invocations" | "basePlan";
  public name: string;
  public pricePerAdditionalUnitInCents: number;
  public unitSize: number;
  public unitSymbol: string;
  private includedFree: Record<PlanType, number>;
  private stripePriceIds: Record<PlanType, string>;

  constructor(options: ProductOptions) {
    this.key = options.key;
    this.name = options.name;
    this.includedFree = options.includedFree;
    this.pricePerAdditionalUnitInCents = options.priceInCentsPerAdditionalUnit;
    this.unitSize = options.unitSize;
    this.unitSymbol = options.unit;
    this.stripePriceIds = options.stripePriceIds;
  }

  getIncludedFree(plan: PlanType) {
    return this.includedFree[plan]!;
  }

  getAdditionalChargeInCents(totalUsage: number, plan: PlanType) {
    const includedFree = this.getIncludedFree(plan);
    if (totalUsage < includedFree) {
      return 0;
    }

    const overusage = totalUsage - includedFree;

    return (overusage * this.pricePerAdditionalUnitInCents) / this.unitSize;
  }

  getIncludedFreeUsageAsFraction(totalUsage: number, plan: PlanType) {
    return Math.min(totalUsage / this.getIncludedFree(plan), 1);
  }

  getStripePriceId(plan: PlanType) {
    return this.stripePriceIds[plan];
  }
}

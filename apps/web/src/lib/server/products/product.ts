type ProductOptions = {
  key: "processedTransactions" | "gbHours" | "invocations";
  name: string;
  includedFree: {
    [key: string]: number;
  };
  priceInCentsPerAdditionalUnit: number;
  unitSize: number;
  unit: string;
};

export class Product {
  public key: "processedTransactions" | "gbHours" | "invocations";
  public name: string;
  public pricePerAdditionalUnitInCents: number;
  public unitSize: number;
  public unitSymbol: string;
  private includedFree: {
    [key: string]: number;
  };

  constructor(options: ProductOptions) {
    this.key = options.key;
    this.name = options.name;
    this.includedFree = options.includedFree;
    this.pricePerAdditionalUnitInCents = options.priceInCentsPerAdditionalUnit;
    this.unitSize = options.unitSize;
    this.unitSymbol = options.unit;
  }

  getIncludedFree(plan: string) {
    return this.includedFree[plan]!;
  }

  getAdditionalChargeInCents(totalUsage: number, plan: string) {
    const includedFree = this.getIncludedFree(plan);
    if (totalUsage < includedFree) {
      return 0;
    }

    const overusage = totalUsage - includedFree;

    return (overusage * this.pricePerAdditionalUnitInCents) / this.unitSize;
  }

  getIncludedFreeUsageAsFraction(totalUsage: number, plan: string) {
    return Math.min(totalUsage / this.getIncludedFree(plan), 1);
  }
}

import { planLoader, Product } from "./planLoader";

export const getQuota = async (
  product: Product["key"],
  project: {
    planType: "HOBBY" | "PRO" | "ENTERPRISE";
    planUrl: string | null;
  },
) => {
  const plan = await planLoader.loadForIdentifier(
    project.planType === "HOBBY" || project.planType === "PRO"
      ? project.planType
      : project.planUrl!,
  );

  const productData = plan.products.find((p) => p.key === product);
  if (!productData) {
    throw new Error(`Product ${product} not found in plan`);
  }
  return productData.includedFree;
};

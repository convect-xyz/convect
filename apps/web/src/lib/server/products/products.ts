import { env } from "~/env";
import { ExtendedPricing } from "./loader";

function stripeEnv(m: Record<typeof env.STRIPE_ENVIRONMENT, string>) {
  return m[env.STRIPE_ENVIRONMENT];
}

export type ProductMetadata = {
  key: keyof typeof availableProducts;
  name: string;
  billingType: "tiered" | "fixed";
  unitSymbol: string;
  unitSize: number;
  stripeProductId: string;
};

const _productMetadata = {
  processedTransactions: {
    name: "Processed Transactions",
    billingType: "tiered",
    unitSymbol: "Txs",
    unitSize: 100000,
    stripeProductId: stripeEnv({
      live: "prod_SH5tMYiw0IjACU",
      test: "prod_SGmiQGlJQJYWqi",
    }),
  },
  gbHours: {
    name: "GB Hours",
    billingType: "tiered",
    unitSymbol: "GB-Hours",
    unitSize: 1,
    stripeProductId: stripeEnv({
      live: "prod_SH5tWNMU8isZoF",
      test: "prod_SGmxyGyvPFVKAp",
    }),
  },
  invocations: {
    name: "Invocations",
    billingType: "tiered",
    unitSymbol: "",
    unitSize: 1000000,
    stripeProductId: stripeEnv({
      live: "prod_SH60CVtIfcHv7n",
      test: "prod_SGmqHQMK99Q0FF",
    }),
  },
  convectFunctions: {
    name: "Convect Functions",
    billingType: "tiered",
    unitSymbol: "",
    unitSize: 1,
    stripeProductId: stripeEnv({
      live: "prod_SH5tglQAAgvO76",
      test: "prod_SH4wLhpCoP8AR2",
    }),
  },
  basePlan: {
    name: "Base Plan",
    billingType: "fixed",
    unitSymbol: "USD",
    unitSize: 1,
    stripeProductId: stripeEnv({
      live: "prod_SH5tG7lnbTPgTd",
      test: "prod_SGn8gqJ9pf6UFs",
    }),
  },
} as const;

export const availableProducts = new Proxy(
  {} as Record<keyof typeof productMetadata, keyof typeof productMetadata>,
  {
    get(target, key) {
      const metadata = _productMetadata[key as keyof typeof _productMetadata];
      if (!metadata) {
        return null;
      }

      return key as keyof typeof _productMetadata;
    },
    set(target, key, value) {
      throw new Error("Cannot set availableProducts");
    },
    ownKeys(target) {
      return Object.keys(_productMetadata);
    },
    getOwnPropertyDescriptor(target, key) {
      return Object.getOwnPropertyDescriptor(_productMetadata, key);
    },
    has(target, key) {
      return key in _productMetadata;
    },
    deleteProperty(target, key) {
      throw new Error("Cannot delete availableProducts");
    },
    getPrototypeOf(target) {
      return null;
    },
    setPrototypeOf(target, prototype) {
      throw new Error("Cannot setPrototypeOf availableProducts");
    },
    isExtensible(target) {
      return true;
    },
    preventExtensions(target) {
      throw new Error("Cannot preventExtensions availableProducts");
    },
  },
);

export const productMetadata = new Proxy(
  {} as Record<keyof typeof _productMetadata, ProductMetadata>,
  {
    get(target, key) {
      const metadata = _productMetadata[key as keyof typeof _productMetadata];
      if (!metadata) {
        return null;
      }

      return {
        key: key as keyof typeof _productMetadata,
        ...metadata,
      } satisfies ProductMetadata;
    },
    set(target, key, value) {
      throw new Error("Cannot set productMetadata");
    },
    ownKeys(target) {
      return Object.keys(_productMetadata);
    },
    getOwnPropertyDescriptor(target, key) {
      return Object.getOwnPropertyDescriptor(_productMetadata, key);
    },
    has(target, key) {
      return key in _productMetadata;
    },
    deleteProperty(target, key) {
      throw new Error("Cannot delete productMetadata");
    },
    getPrototypeOf(target) {
      return null;
    },
    setPrototypeOf(target, prototype) {
      throw new Error("Cannot setPrototypeOf productMetadata");
    },
    isExtensible(target) {
      return true;
    },
    preventExtensions(target) {
      throw new Error("Cannot preventExtensions productMetadata");
    },
  },
);

export function getDefaultPricing(product: ExtendedPricing["key"]) {
  const metadata = productMetadata[product];
  if (metadata.billingType === "tiered") {
    return {
      key: product,
      price: {
        _type: "tiered" as const,
        includedFree: 0,
        priceInCentsPerAdditionalUnit: "0",
      },
      stripePriceId: "",
    };
  }

  return {
    key: product,
    price: {
      _type: "fixed" as const,
      priceInCents: "0",
    },
    stripePriceId: "",
  };
}

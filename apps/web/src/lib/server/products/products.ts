import { env } from "~/env";
import { ExtendedPricing } from "./loader";

function stripeEnv(m: Record<typeof env.STRIPE_ENVIRONMENT, string>) {
  return m[env.STRIPE_ENVIRONMENT];
}

export type ProductMetadata = {
  key: keyof typeof availableProducts;
  name: string;
  billing:
    | {
        _type: "tiered";
        stripeMeterId: string;
      }
    | {
        _type: "fixed";
      };
  unitSymbol: string;
  unitSize: number;
  stripeProductId: string;
};

const _productMetadata = {
  processedTransactions: {
    name: "Processed Transactions",
    billing: {
      _type: "tiered",
      stripeMeterId: stripeEnv({
        live: "mtr_61SVvfEItBhxBODri412LJct0ubJ3BHk",
        test: "mtr_test_61SVd6Q7sGRBSrxk941Ru90pWJjEEOaW",
      }),
    },
    unitSymbol: "Txs",
    unitSize: 100000,
    stripeProductId: stripeEnv({
      live: "prod_SH5tMYiw0IjACU",
      test: "prod_SGmiQGlJQJYWqi",
    }),
  },
  mbSeconds: {
    name: "Mb Seconds",
    billing: {
      _type: "tiered",
      stripeMeterId: stripeEnv({
        live: "mtr_61SVvf7xra8a21F8q412LJct0ubJ3CQK",
        test: "mtr_test_61SVdJZtFpAtSv84541Ru90pWJjEEJua",
      }),
    },
    unitSymbol: "Mb-Seconds",
    unitSize: 1,
    stripeProductId: stripeEnv({
      live: "prod_SH5tWNMU8isZoF",
      test: "prod_SGmxyGyvPFVKAp",
    }),
  },
  gbHours: {
    name: "GB Hours",
    billing: {
      _type: "tiered",
      stripeMeterId: stripeEnv({
        live: "mtr_61SVvf7xra8a21F8q412LJct0ubJ3CQK",
        test: "mtr_test_61SVdJZtFpAtSv84541Ru90pWJjEEJua",
      }),
    },
    unitSymbol: "GB-Hours",
    unitSize: 1,
    stripeProductId: stripeEnv({
      live: "prod_SH5tWNMU8isZoF",
      test: "prod_SGmxyGyvPFVKAp",
    }),
  },
  invocations: {
    name: "Invocations",
    billing: {
      _type: "tiered",
      stripeMeterId: stripeEnv({
        live: "mtr_61R3K5oOMvFVQ4Rc5412LJct0ubJ39se",
        test: "mtr_test_61SVdE6FPq9FDxAKp41Ru90pWJjEE0fQ",
      }),
    },
    unitSymbol: "",
    unitSize: 1000000,
    stripeProductId: stripeEnv({
      live: "prod_SH60CVtIfcHv7n",
      test: "prod_SGmqHQMK99Q0FF",
    }),
  },
  convectFunctions: {
    name: "Convect Functions",
    billing: {
      _type: "tiered",
      stripeMeterId: stripeEnv({
        live: "mtr_61SWb8yx11nEq1nrG412LJct0ubJ38X2",
        test: "mtr_test_61SWb8Kssc9czO6zx41Ru90pWJjEEGIC",
      }),
    },
    unitSymbol: "",
    unitSize: 1,
    stripeProductId: stripeEnv({
      live: "prod_SH5tglQAAgvO76",
      test: "prod_SH4wLhpCoP8AR2",
    }),
  },
  basePlan: {
    name: "Base Plan",
    billing: {
      _type: "fixed",
    },
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
  if (metadata.billing._type === "tiered") {
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

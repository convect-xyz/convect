import "server-only";

import { Product } from "./product";

export const basePlanProduct = new Product({
  key: "basePlan",
  name: "Base Plan",
  includedFree: {
    HOBBY: 0,
    PRO: 0,
    ENTERPRISE: 0,
  },
  unitSize: 1,
  unit: "",
  priceInCentsPerAdditionalUnit: 0,
  stripePriceIds: {
    HOBBY: "price_1PrjjN2LJct0ubJ3I4N6E7JB",
    PRO: "price_1Prjjm2LJct0ubJ3rUXID3wG",
    ENTERPRISE: "",
  },
});

export const invocationsProduct = new Product({
  key: "invocations",
  name: "Invocations",
  includedFree: {
    HOBBY: 100_000,
    PRO: 100_000,
    ENTERPRISE: 100_000,
  },
  unitSize: 1000000,
  unit: "",
  priceInCentsPerAdditionalUnit: 60,
  stripePriceIds: {
    HOBBY: "price_1PrjZr2LJct0ubJ3yrnN4f8V",
    PRO: "price_1PrjYY2LJct0ubJ30GqZ3NJ1",
    ENTERPRISE: "",
  },
});

export const gbHoursProduct = new Product({
  key: "gbHours",
  name: "GB Hours",
  includedFree: {
    HOBBY: 100,
    PRO: 100,
    ENTERPRISE: 100,
  },
  unitSize: 1,
  unit: "GB-Hours",
  priceInCentsPerAdditionalUnit: 18,
  stripePriceIds: {
    HOBBY: "price_1PrjVN2LJct0ubJ3nAoUigkm",
    PRO: "price_1PriFC2LJct0ubJ31Q1FAqwq",
    ENTERPRISE: "",
  },
});

export const processedTransactionsProduct = new Product({
  key: "processedTransactions",
  name: "Processed Transactions",
  includedFree: {
    HOBBY: 10_000,
    PRO: 10_000,
    ENTERPRISE: 10_000,
  },
  unitSize: 100000,
  unit: "Txs",
  priceInCentsPerAdditionalUnit: 20,
  stripePriceIds: {
    HOBBY: "price_1Prjf42LJct0ubJ3sNI2lq9V",
    PRO: "price_1PrjdK2LJct0ubJ33itFUXlF",
    ENTERPRISE: "",
  },
});

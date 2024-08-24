import "server-only";

import { Product } from "./product";

export const invocationsProduct = new Product({
  key: "invocations",
  name: "Invocations",
  includedFree: {
    free: 100_000,
    starter: 100_000,
    pro: 100_000,
  },
  unitSize: 1000000,
  unit: "",
  priceInCentsPerAdditionalUnit: 60,
});

export const gbHoursProduct = new Product({
  key: "gbHours",
  name: "GB Hours",
  includedFree: {
    free: 100,
    starter: 100,
    pro: 100,
  },
  unitSize: 1,
  unit: "GB-Hours",
  priceInCentsPerAdditionalUnit: 18,
});

export const processedTransactionsProduct = new Product({
  key: "processedTransactions",
  name: "Processed Transactions",
  includedFree: {
    free: 10_000,
    starter: 10_000,
    pro: 10_000,
  },
  unitSize: 100000,
  unit: "Txs",
  priceInCentsPerAdditionalUnit: 20,
});

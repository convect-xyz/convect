export const availableProducts = {
  processedTransactions: "processedTransactions",
  convectFunctions: "convectFunctions",
  gbHours: "gbHours",
  invocations: "invocations",
  basePlan: "basePlan",
} as const;

export type ProductMetadata = {
  key: string;
  name: string;
  unitSymbol: string;
  unitSize: number;
};

export const productMetadata: Record<
  keyof typeof availableProducts,
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
  convectFunctions: {
    key: "convectFunctions",
    name: "Convect Functions",
    unitSymbol: "",
    unitSize: 1,
  },
  basePlan: {
    key: "basePlan",
    name: "Base Plan",
    unitSymbol: "",
    unitSize: 1,
  },
};

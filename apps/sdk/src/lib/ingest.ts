export function ingest<
  TTransactions,
  TCreateReturn extends Record<string, string | number | boolean>,
>(options: {
  transactions: TTransactions;
  onCreate?: () => Promise<TCreateReturn>;
  onReset?: (params: TCreateReturn) => Promise<void>;
  onDelete?: (params: TCreateReturn) => Promise<void>;
}) {
  return {
    ...options,
  };
}

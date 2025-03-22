import { useDebounce } from "@uidotdev/usehooks";
import { PropsWithChildren, createContext, useContext, useState } from "react";

type TransactionFilters = {
  search?: string;
  debouncedSearch?: string;
  setSearch: (v: string) => void;
  status: Array<"FAILED" | "SUCCESS" | "PENDING">;
  setStatus: (v: Array<"FAILED" | "SUCCESS" | "PENDING">) => void;
  txConfigs: Array<number>;
  setTxConfigs: (v: Array<number>) => void;
};

const TransactionFiltersContext = createContext<TransactionFilters>({} as any);

export function useTransactionFilters() {
  return useContext(TransactionFiltersContext);
}

export default function TransactionFilters(props: PropsWithChildren) {
  const [search, setSearch] = useState<string>();
  const [status, setStatus] = useState<Array<"FAILED" | "SUCCESS" | "PENDING">>(
    ["SUCCESS", "FAILED"],
  );
  const [txConfig, setTxConfig] = useState<Array<number>>([]);

  const debouncedSearch = useDebounce(search, 500);

  return (
    <TransactionFiltersContext.Provider
      value={{
        search,
        debouncedSearch,
        setSearch,
        status,
        setStatus,
        txConfigs: txConfig,
        setTxConfigs: setTxConfig,
      }}
    >
      {props.children}
    </TransactionFiltersContext.Provider>
  );
}

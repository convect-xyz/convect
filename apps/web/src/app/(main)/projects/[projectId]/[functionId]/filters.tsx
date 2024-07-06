import { useDebounce } from "@uidotdev/usehooks";
import { PropsWithChildren, createContext, useContext, useState } from "react";

type TransactionFilters = {
  search?: string;
  debouncedSearch?: string;
  setSearch: (v: string) => void;
  status?: "FAILED" | "SUCCESS";
  setStatus: (v?: "FAILED" | "SUCCESS") => void;
};

const TransactionFiltersContext = createContext<TransactionFilters>({} as any);

export function useTransactionFilters() {
  return useContext(TransactionFiltersContext);
}

export default function TransactionFilters(props: PropsWithChildren) {
  const [search, setSearch] = useState<string>();
  const [status, setStatus] = useState<"FAILED" | "SUCCESS">();

  const debouncedSearch = useDebounce(search, 500);

  return (
    <TransactionFiltersContext.Provider
      value={{
        search,
        debouncedSearch,
        setSearch,
        status,
        setStatus,
      }}
    >
      {props.children}
    </TransactionFiltersContext.Provider>
  );
}

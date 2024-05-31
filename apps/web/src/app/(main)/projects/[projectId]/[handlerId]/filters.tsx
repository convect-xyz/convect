import { useDebounce } from "@uidotdev/usehooks";
import { PropsWithChildren, createContext, useContext, useState } from "react";

type TransactionFilters = {
  search?: string;
  debouncedSearch?: string;
  setSearch: (v: string) => void;
};

const TransactionFiltersContext = createContext<TransactionFilters>({} as any);

export function useTransactionFilters() {
  return useContext(TransactionFiltersContext);
}

export default function TransactionFilters(props: PropsWithChildren) {
  const [search, setSearch] = useState<string>();

  const debouncedSearch = useDebounce(search, 500);

  return (
    <TransactionFiltersContext.Provider
      value={{
        search,
        debouncedSearch,
        setSearch,
      }}
    >
      {props.children}
    </TransactionFiltersContext.Provider>
  );
}

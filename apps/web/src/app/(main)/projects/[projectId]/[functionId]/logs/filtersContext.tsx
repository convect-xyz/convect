import { PropsWithChildren, createContext, useContext, useState } from "react";
import { RouterInputs } from "~/trpc/shared";

type AllowedLevels = RouterInputs["functions"]["getLogs"]["logLevel"];
type LogFilters = {
  logLevel?: AllowedLevels;
  setLogLevel: (v: AllowedLevels) => void;
};

const LogFiltersContext = createContext<LogFilters>({} as any);

export function useFilters() {
  return useContext(LogFiltersContext);
}

export default function LogFilters(props: PropsWithChildren) {
  const [logLevel, setLogLevel] = useState<LogFilters["logLevel"]>([
    "INFO",
    "DEBUG",
    "ERROR",
  ]);

  return (
    <LogFiltersContext.Provider
      value={{
        logLevel,
        setLogLevel,
      }}
    >
      {props.children}
    </LogFiltersContext.Provider>
  );
}

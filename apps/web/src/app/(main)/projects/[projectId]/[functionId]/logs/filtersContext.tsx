import { PropsWithChildren, createContext, useContext, useState } from "react";
import { DateRange } from "react-day-picker";
import { RouterInputs } from "~/trpc/shared";

type AllowedLevels = RouterInputs["functions"]["getLogs"]["logLevel"];
type LogFilters = {
  logLevel?: AllowedLevels;
  setLogLevel: (v: AllowedLevels) => void;
  timeRange?: DateRange;
  setTimeRange: (v?: DateRange) => void;
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

  const [timeRange, setTimeRange] = useState<DateRange>();

  return (
    <LogFiltersContext.Provider
      value={{
        logLevel,
        setLogLevel,
        timeRange,
        setTimeRange,
      }}
    >
      {props.children}
    </LogFiltersContext.Provider>
  );
}

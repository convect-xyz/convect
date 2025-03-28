import { Checkbox } from "~/components/ui/checkbox";
import { useFilters } from "../filtersContext";

export function LogLevelFilter() {
  const filters = useFilters();

  return (
    <div>
      <div className="flex flex-col gap-2">
        {(
          [
            {
              value: "DEBUG",
              label: "Debug",
            },
            {
              value: "INFO",
              label: "Info",
            },
            {
              value: "ERROR",
              label: "Error",
            },
          ] as const
        ).map((logLevel) => (
          <div className="flex items-center space-x-2">
            <Checkbox
              className="border-muted-foreground"
              id={logLevel.value}
              checked={filters.logLevel?.includes(logLevel.value) ?? false}
              onCheckedChange={() => {
                if (filters.logLevel?.includes(logLevel.value)) {
                  filters.setLogLevel(
                    filters.logLevel?.filter((v) => v !== logLevel.value),
                  );
                } else {
                  filters.setLogLevel([
                    ...(filters.logLevel ?? []),
                    logLevel.value,
                  ]);
                }
              }}
            />
            <label
              htmlFor={logLevel.value}
              className="text-xs leading-none text-muted-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {logLevel.label}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

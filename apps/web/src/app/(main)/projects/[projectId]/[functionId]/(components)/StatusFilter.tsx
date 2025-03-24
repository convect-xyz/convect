import { Checkbox } from "~/components/ui/checkbox";
import { useTransactionFilters } from "../filters";
import { useSelectedDeployment } from "../hooks/useSelectedDeployment";

export function StatusFilter() {
  const { data: selectedDeployment } = useSelectedDeployment();
  const filters = useTransactionFilters();
  if (!selectedDeployment) {
    return null;
  }

  return (
    <div>
      <div className="flex flex-col gap-2">
        {(
          [
            {
              value: "FAILED",
              label: "Failed",
            },
            {
              value: "SUCCESS",
              label: "Success",
            },
            {
              value: "PENDING",
              label: "Pending",
            },
          ] as const
        ).map((status) => (
          <div className="flex items-center space-x-2">
            <Checkbox
              className="border-muted-foreground"
              id={status.value}
              checked={filters.status.includes(status.value)}
              onCheckedChange={() => {
                if (filters.status.includes(status.value)) {
                  filters.setStatus(
                    filters.status.filter((v) => v !== status.value),
                  );
                } else {
                  filters.setStatus([...filters.status, status.value]);
                }
              }}
            />
            <label
              htmlFor={status.value}
              className="text-xs leading-none text-muted-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {status.label}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

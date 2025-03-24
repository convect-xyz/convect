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
        {(["FAILED", "SUCCESS"] as const).map((status) => (
          <div className="flex items-center space-x-2">
            <Checkbox
              className="border-muted-foreground"
              id={status}
              checked={filters.status.includes(status)}
              onCheckedChange={() => {
                if (filters.status.includes(status)) {
                  filters.setStatus(filters.status.filter((v) => v !== status));
                } else {
                  filters.setStatus([...filters.status, status]);
                }
              }}
            />
            <label
              htmlFor={status}
              className="text-xs leading-none text-muted-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {status}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

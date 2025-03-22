import { Checkbox } from "~/components/ui/checkbox";
import { useTransactionFilters } from "../filters";
import { useSelectedDeployment } from "../hooks/useSelectedDeployment";

export function HandlerFilter() {
  const { data: selectedDeployment } = useSelectedDeployment();
  const filters = useTransactionFilters();
  if (!selectedDeployment) {
    return null;
  }

  return (
    <div>
      <div className="flex flex-col gap-3">
        {selectedDeployment.deployment.manifest.tx_configs.map(
          (txConfig, idx) => (
            <div className="flex items-center space-x-2">
              <Checkbox
                className="h-5 w-5 border-muted-foreground"
                id={`txConfig-${idx}`}
                onCheckedChange={() => {
                  if (filters.txConfigs.includes(idx)) {
                    filters.setTxConfigs(
                      filters.txConfigs.filter((v) => v !== idx),
                    );
                  } else {
                    filters.setTxConfigs([...filters.txConfigs, idx]);
                  }
                }}
              />
              <label
                htmlFor={`txConfig-${idx}`}
                className="text-sm leading-none text-muted-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {txConfig.name}
              </label>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

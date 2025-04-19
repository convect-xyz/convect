import { Checkbox } from "~/components/ui/checkbox";
import { useTransactionFilters } from "../filters";
import { useSelectedChainId } from "../hooks/useSelectedChainId";
import { useSelectedDeployment } from "../hooks/useSelectedDeployment";

export function HandlerFilter() {
  const { data: selectedDeployment } = useSelectedDeployment();
  const selectedChainId = useSelectedChainId();

  const filters = useTransactionFilters();
  if (!selectedDeployment || !selectedChainId) {
    return null;
  }

  return (
    <div>
      <div className="flex flex-col gap-2">
        {selectedDeployment.deployment.manifest.tx_configs
          .map((txConfig, idx) => ({ txConfig, idx }))
          .filter(({ txConfig }) => txConfig.chains?.includes(selectedChainId))
          .map(({ txConfig, idx }) => (
            <div className="flex items-center space-x-2">
              <Checkbox
                className="border-muted-foreground"
                id={`txConfig-${idx}`}
                checked={filters.txConfigs.includes(idx)}
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
                className="text-xs leading-none text-muted-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {txConfig.name}
              </label>
            </div>
          ))}
      </div>
    </div>
  );
}

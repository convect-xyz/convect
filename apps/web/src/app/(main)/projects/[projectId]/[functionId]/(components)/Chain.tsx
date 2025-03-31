import { times } from "lodash";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import ChainIcon from "~/components/icons/ChainIcon";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";
import { useParams } from "../hooks/useParams";
import { useSelectedDeployment } from "../hooks/useSelectedDeployment";

export function Chain(props: { withLabel?: boolean }) {
  const { chainId } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { data: overview } = useSelectedDeployment();

  const chains = overview?.deployment.manifest.chains;

  useEffect(() => {
    if (!chains) {
      return;
    }

    if (
      !searchParams.get("chainId") &&
      overview &&
      overview?.deployment.manifest.chains.length > 0
    ) {
      handleValueChange(
        overview?.deployment.manifest.chains.at(0)!.chainId.toString(),
      );
    }
  }, [searchParams, overview]);

  const handleValueChange = (v: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("chainId", v);

    params.toString();
    router.replace(pathname + "?" + params.toString());
  };

  return (
    <Select value={chainId?.toString()} onValueChange={handleValueChange}>
      <SelectTrigger
        className={cn("w-full bg-muted text-sm", !props.withLabel && "w-auto")}
      >
        <div className="flex flex-1 items-center gap-2 overflow-hidden text-left">
          <ChainIcon
            chainId={
              overview?.deployment.manifest.chains.find(
                (f) => f.chainId === chainId,
              )?.chainId ?? 0
            }
          />
          {props.withLabel && (
            <div className="flex-1 truncate">
              {overview?.deployment.manifest.chains.find(
                (f) => f.chainId === chainId,
              )?.name ?? ""}
            </div>
          )}
        </div>
      </SelectTrigger>
      <SelectContent>
        {!chains &&
          times(3).map((v) => (
            <SelectItem value={v.toString()} disabled>
              <div className="flex flex-1 items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            </SelectItem>
          ))}
        {chains?.map((h) => (
          <SelectItem value={h.chainId.toString()}>
            <div className="flex items-center gap-2">
              <ChainIcon chainId={h.chainId} />
              <div>{h.name}</div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

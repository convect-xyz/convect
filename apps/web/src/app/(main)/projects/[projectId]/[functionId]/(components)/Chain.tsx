import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import ChainIcon from "~/components/icons/ChainIcon";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "~/components/ui/select";
import { useOverview } from "../hooks/useOverview";
import { useParams } from "../hooks/useParams";

export function Chain() {
  const { chainId } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { data: overview } = useOverview();

  useEffect(() => {
    if (!overview?.chains) {
      return;
    }

    if (
      !searchParams.get("chainId") &&
      overview &&
      overview.chains.length > 0
    ) {
      handleValueChange(overview.chains.at(0)!.chainId.toString());
    }
  }, [searchParams, overview]);

  const handleValueChange = (v: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("chainId", v);

    params.toString();
    router.replace(pathname + "?" + params.toString());
  };

  if (!overview?.chains) {
    return null;
  }

  return (
    <Select value={chainId?.toString()} onValueChange={handleValueChange}>
      <SelectTrigger className="h-auto w-[55px] bg-muted">
        <ChainIcon
          chainId={
            overview?.chains.find((f) => f.chainId === chainId)?.chainId ?? 0
          }
        />
      </SelectTrigger>
      <SelectContent>
        {overview?.chains.map((h) => (
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

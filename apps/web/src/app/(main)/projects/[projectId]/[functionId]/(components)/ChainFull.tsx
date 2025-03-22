import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import ChainIcon from "~/components/icons/ChainIcon";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "~/components/ui/select";
import { useParams } from "../hooks/useParams";
import { useSelectedDeployment } from "../hooks/useSelectedDeployment";

export function ChainFull() {
  const { chainId } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { data: overview } = useSelectedDeployment();

  useEffect(() => {
    if (!overview?.deployment.manifest.chains) {
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

  if (!overview?.deployment.manifest.chains) {
    return null;
  }

  return (
    <Select value={chainId?.toString()} onValueChange={handleValueChange}>
      <SelectTrigger className="w-full bg-muted">
        <div className="flex items-center gap-2">
          <ChainIcon
            chainId={
              overview?.deployment.manifest.chains.find(
                (f) => f.chainId === chainId,
              )?.chainId ?? 0
            }
          />
          <div>
            {overview?.deployment.manifest.chains.find(
              (f) => f.chainId === chainId,
            )?.name ?? ""}
          </div>
        </div>
      </SelectTrigger>
      <SelectContent>
        {overview?.deployment.manifest.chains.map((h) => (
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

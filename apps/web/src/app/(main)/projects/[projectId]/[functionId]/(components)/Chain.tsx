import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import ChainIcon from "~/components/icons/ChainIcon";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "~/components/ui/select";
import { api } from "~/trpc/react";
import { useParams } from "../hooks/useParams";

export function Chain() {
  const { handlerId, projectId, functionId } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { data: fn } = api.functions.get.useQuery(
    {
      projectId,
      functionId,
    },
    {
      enabled: !!handlerId,
    },
  );

  useEffect(() => {
    if (!searchParams.get("handlerId") && fn && fn.chains.length > 0) {
      handleValueChange(fn.chains.at(0)!.chainId.toString());
    }
  }, [searchParams, fn]);

  const handleValueChange = (v: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("handlerId", v);

    params.toString();
    router.replace(pathname + "?" + params.toString());
  };

  return (
    <Select value={handlerId?.toString()} onValueChange={handleValueChange}>
      <SelectTrigger className="h-auto w-[55px] bg-muted">
        <ChainIcon
          chainId={
            fn?.chains.find((f) => f.chainId === handlerId)?.chainId ?? 0
          }
        />
      </SelectTrigger>
      <SelectContent>
        {fn?.chains.map((h) => (
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

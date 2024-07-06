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
    if (!searchParams.get("handlerId") && fn && fn.handlers.length > 0) {
      handleValueChange(fn.handlers.at(0)!.id.toString());
    }
  }, [searchParams, fn]);

  const handleValueChange = (v: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("handlerId", v);

    params.toString();
    router.push(pathname + "?" + params.toString());
  };

  return (
    <Select value={handlerId?.toString()} onValueChange={handleValueChange}>
      <SelectTrigger className="h-auto w-[55px] bg-muted">
        <ChainIcon
          chainId={
            fn?.handlers.find((f) => f.id === handlerId)?.producer.chainId ?? 0
          }
        />
      </SelectTrigger>
      <SelectContent>
        {fn?.handlers.map((h) => (
          <SelectItem value={h.id.toString()}>
            <div className="flex items-center gap-2">
              <ChainIcon chainId={h.producer.chainId} />
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

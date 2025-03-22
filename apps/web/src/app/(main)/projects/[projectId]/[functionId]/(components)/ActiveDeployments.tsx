import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { api } from "~/trpc/react";
import { useParams } from "../hooks/useParams";

export function ActiveDeployments() {
  const { projectId, functionId } = useParams();
  const { data: fn } = api.functions.get.useQuery({
    projectId: projectId,
    functionId: functionId,
  });
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const handleValueChange = (v: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("deploymentId", v);

    params.toString();
    router.replace(pathname + "?" + params.toString());
  };

  return (
    <Select
      value={searchParams.get("deploymentId") ?? fn?.activeDeployments[0]?.id}
      onValueChange={handleValueChange}
    >
      <SelectTrigger className="w-full bg-background">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {fn?.activeDeployments.map((deployment) => (
          <SelectItem value={deployment.id}>
            <div className="flex items-center gap-2">
              {deployment.id.slice(0, 6)}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

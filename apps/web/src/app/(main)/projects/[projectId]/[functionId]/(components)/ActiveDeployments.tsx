import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "~/components/ui/select";
import { api } from "~/trpc/react";
import { useParams } from "../hooks/useParams";
import { useSelectedDeploymentId } from "../hooks/useSelectedDeploymentId";

export function ActiveDeployments() {
  const { projectId, functionId } = useParams();
  const { data: fn } = api.functions.get.useQuery({
    projectId: projectId,
    functionId: functionId,
  });
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const deploymentId = useSelectedDeploymentId();

  const handleValueChange = (v: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("deploymentId", v);

    params.toString();
    router.replace(pathname + "?" + params.toString());
  };

  const selectedDeployment = fn?.activeDeployments.find(
    (d) => d.id === deploymentId,
  );

  return (
    <Select
      value={searchParams.get("deploymentId") ?? fn?.activeDeployments[0]?.id}
      onValueChange={handleValueChange}
    >
      <SelectTrigger className="w-full px-1">
        <div className="flex-1 overflow-hidden text-left">
          <div className="flex items-center gap-1">
            <span className="rounded-full border bg-black px-2 text-[10px]">
              Deployment
            </span>
            &bull;
            <div className="flex-1 truncate text-xs">
              {selectedDeployment?.id.slice(0, 6)}
            </div>
          </div>
        </div>
      </SelectTrigger>
      <SelectContent>
        {fn?.activeDeployments.map((deployment) => (
          <SelectItem value={deployment.id} key={deployment.id}>
            <div className="flex items-center gap-2">
              {deployment.id.slice(0, 6)}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

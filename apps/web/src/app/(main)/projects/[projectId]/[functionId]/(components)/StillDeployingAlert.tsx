import { TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";

export function StillDeployingAlert() {
  const { functionId, projectId } = useParams();
  return (
    <Alert variant="warning">
      <TriangleAlertIcon className="h-5 w-5 flex-shrink-0 text-amber-50" />
      <AlertTitle>Deploying</AlertTitle>
      <AlertDescription className="text-sm">
        View it in{" "}
        <Link
          href={`/projects/${projectId}/${functionId}/deployments`}
          className="underline"
        >
          deployments
        </Link>{" "}
        for progress updates.
      </AlertDescription>
    </Alert>
  );
}

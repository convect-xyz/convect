import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";

export function BillingOverdueAlert(props: { projectId: number }) {
  return (
    <Alert variant="default">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Billing Overdue</AlertTitle>
      <AlertDescription>
        <div>
          Your invoice is overdue. Please update your payment method to avoid
          service interruption.
        </div>

        <Button size="sm" asChild className="mt-2">
          <Link href={`/projects/${props.projectId}/settings/billing`}>
            Update Payment Method
          </Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}

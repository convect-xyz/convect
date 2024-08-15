"use client";

import { CheckIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import { RouterOutputs } from "~/trpc/shared";

export default function Page() {
  const [open, setIsOpen] = useState(false);

  return (
    <div className="mx-auto w-full max-w-screen-lg">
      <div className="text-3xl">Invites</div>
      <div>Manage your project invites here.</div>
      <div className="mt-4">
        <PendingInvites />
      </div>
    </div>
  );
}

function PendingInvites() {
  const { data: pendingInvites } = api.accounts.getPendingInvites.useQuery();

  return (
    <div className="flex flex-col gap-2 rounded-md">
      {pendingInvites?.map((invite) => (
        <PendingInvite key={invite.project.id} invite={invite} />
      ))}
    </div>
  );
}
function PendingInvite(props: {
  invite: RouterOutputs["accounts"]["getPendingInvites"][number];
}) {
  const { invite } = props;
  const utils = api.useUtils();
  const { mutateAsync: acceptInvite, isPending: isAccepting } =
    api.accounts.acceptInvite.useMutation({
      onSuccess: () => {
        utils.accounts.getPendingInvites.invalidate();
        toast.success("Invite accepted!");
      },
    });

  return (
    <div className="flex items-center rounded-md bg-muted p-4">
      <div className="flex flex-1 flex-col">
        <span className="text-sm text-muted-foreground">Name</span>
        <span>{invite.project.name}</span>
      </div>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          isLoading={isAccepting}
          onClick={() => acceptInvite({ inviteId: invite.id })}
        >
          <CheckIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

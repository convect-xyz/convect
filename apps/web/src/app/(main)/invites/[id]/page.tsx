import { redirect } from "next/navigation";
import { caller } from "~/trpc/server";

type Props = {
  params: {
    id: string;
  };
  searchParams: {
    accept?: string;
  };
};

export default async function Page({ params, searchParams }: Props) {
  const { id } = params;
  const { accept } = searchParams;

  if (accept !== "true") {
    return null;
  }

  const { projectId } = await caller.accounts.acceptInvite({
    inviteId: parseInt(id),
  });

  redirect(`/projects/${projectId}`);
}

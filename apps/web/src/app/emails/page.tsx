import { redirect } from "next/navigation";
import InviteSentTemplate from "~/components/emails/InviteSentTemplate";

export default function Page() {
  if (process.env.NODE_ENV !== "development") {
    redirect("/404");
  }
  return (
    <InviteSentTemplate
      inviteId="123"
      senderUsername="Test User"
      projectName="Test Project"
    />
  );
}

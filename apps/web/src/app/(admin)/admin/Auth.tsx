import { redirect } from "next/navigation";
import { PropsWithChildren } from "react";
import { auth } from "~/auth";

export default async function Auth(props: PropsWithChildren) {
  const session = await auth();
  if (session?.user.email !== "kayakthedev@gmail.com") {
    return redirect("/");
  }

  return <>{props.children}</>;
}

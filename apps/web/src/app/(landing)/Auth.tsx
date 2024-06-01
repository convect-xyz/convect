import { PropsWithChildren } from "react";
import { auth } from "~/auth";

export default async function Auth(props: PropsWithChildren) {
  const session = await auth();
  // if (session) return redirect("/projects");

  return <>{props.children}</>;
}

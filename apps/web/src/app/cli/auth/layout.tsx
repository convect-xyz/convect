import { PropsWithChildren } from "react";

import Auth from "./Auth";

export default function Layout(props: PropsWithChildren) {
  return <Auth>{props.children}</Auth>;
}

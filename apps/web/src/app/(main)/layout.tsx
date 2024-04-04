import { PropsWithChildren } from "react";
import {
  SidebarItem,
  SidebarItemDefinition,
} from "~/components/sidebar/SidebarItem";

const routes: Array<SidebarItemDefinition> = [
  {
    name: "Producers",
    route: "/producers",
  },
];

export default function Layout(props: PropsWithChildren) {
  return (
    <div className="container flex-1 items-start md:grid md:grid-cols-[220px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
      <aside>
        {routes.map((route) => (
          <SidebarItem key={route.name} {...route} />
        ))}
      </aside>
      <div>{props.children}</div>
    </div>
  );
}

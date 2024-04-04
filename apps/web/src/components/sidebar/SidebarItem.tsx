"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "~/lib/utils";

export type SidebarItemDefinition = {
  route: string;
  name: string;
};

export type SidebarItemProps = SidebarItemDefinition;

export function SidebarItem(props: SidebarItemProps) {
  const { route, name } = props;

  const pathname = usePathname();
  const isActive = pathname === props.route;

  console.log(pathname);
  return (
    <Link href={route}>
      <div className={cn("rounded-md px-2 py-2", isActive && "bg-sky-100")}>
        {name}
      </div>
    </Link>
  );
}

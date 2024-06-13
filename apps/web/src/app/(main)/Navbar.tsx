"use client";

import { trim } from "lodash";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "~/components/ui/navigation-menu";

export function Navbar() {
  const { projectId, handlerId } = useParams<{
    projectId?: string;
    handlerId?: string;
  }>();
  const pathname = usePathname();
  if (handlerId) return;
  if (!projectId) return;

  const getLinkProps = (route: string) => {
    const isLinked = trim(route, "/") === trim(pathname, "/");

    return {
      "data-active": isLinked ? true : undefined,
    };
  };

  return (
    <NavigationMenu className="mx-auto w-full max-w-screen-2xl justify-start">
      <NavigationMenuList>
        <NavigationMenuItem>
          <Link href={`/projects/${projectId}`} legacyBehavior passHref>
            <NavigationMenuLink
              className={navigationMenuTriggerStyle()}
              {...getLinkProps(`/projects/${projectId}`)}
            >
              Overview
            </NavigationMenuLink>
          </Link>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <Link
            href={`/projects/${projectId}/settings`}
            legacyBehavior
            passHref
          >
            <NavigationMenuLink
              className={navigationMenuTriggerStyle()}
              {...getLinkProps(`/projects/${projectId}/settings`)}
            >
              Settings
            </NavigationMenuLink>
          </Link>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

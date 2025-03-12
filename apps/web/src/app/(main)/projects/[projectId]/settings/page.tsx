"use client";

import { trim } from "lodash";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "~/lib/utils";
import { useParams } from "../hooks/useParams";
import { useProject } from "../hooks/useProject";
import Overview from "./overview/page";
import { navigation } from "./utils";

export default function Page() {
  const pathname = usePathname();
  const { projectId } = useParams();
  const { data: project } = useProject();

  if (!project) {
    return null;
  }

  const getLinkProps = (routes: string[]) => {
    const isLinked = routes.some(
      (route) => trim(route, "/") === trim(pathname, "/"),
    );

    return {
      className: cn(
        "text-muted-foreground",
        isLinked && " text-primary font-bold",
      ),
      href: routes[0]!,
    };
  };

  return (
    <>
      <div className="flex flex-col divide-y md:hidden">
        {navigation.map(({ name, href }) => (
          <Link key={name} {...getLinkProps(href(projectId))}>
            <div className="flex items-center gap-2 px-6 py-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              {name}
            </div>
          </Link>
        ))}
      </div>
      <div className="hidden md:block">
        <Overview />
      </div>
    </>
  );
}

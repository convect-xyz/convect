"use client";

import { trim } from "lodash";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PropsWithChildren } from "react";
import { cn } from "~/lib/utils";
import { useParams } from "./hooks/useParams";

export default function Layout(props: PropsWithChildren) {
  return (
    <div className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col">
      <Main {...props} />
    </div>
  );
}

function Main(props: PropsWithChildren) {
  const pathname = usePathname();
  const { projectId, functionId } = useParams();

  const getLinkProps = (route: string, isRoot: boolean) => {
    const isLinked = isRoot
      ? trim(pathname, "/") === trim(route, "/")
      : trim(pathname, "/").startsWith(trim(route, "/"));

    return {
      className: cn(
        "text-muted-foreground whitespace-nowrap py-4 px-2 border-b-2 border-transparent",
        isLinked && "text-primary font-bold border-primary",
      ),
      href: route,
    };
  };

  return (
    <>
      <nav className="sticky top-[var(--navbar-height)] z-20 flex w-full gap-4 overflow-x-auto border-b bg-background px-4 text-sm text-muted-foreground md:px-8">
        {!functionId && (
          <>
            <Link {...getLinkProps(`/projects/${projectId}/`, true)}>
              Overview
            </Link>
            <Link {...getLinkProps(`/projects/${projectId}/settings`, false)}>
              Settings
            </Link>
          </>
        )}
      </nav>
      <div className="mx-auto grid w-full items-start gap-6">
        <div>{props.children}</div>
      </div>
    </>
  );
}

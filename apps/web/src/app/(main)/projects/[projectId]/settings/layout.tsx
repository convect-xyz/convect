"use client";

import { trim } from "lodash";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PropsWithChildren } from "react";
import { cn } from "~/lib/utils";
import { useParams } from "../hooks/useParams";
import { navigation } from "./utils";

export default function Layout(props: PropsWithChildren) {
  return (
    <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 md:gap-8">
      <Main {...props} />
    </main>
  );
}

function Main(props: PropsWithChildren) {
  const pathname = usePathname();
  const { projectId } = useParams();

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
    <div className="pb-20 pt-6">
      <div className="border-b px-4 py-8">
        <div className="mx-auto max-w-screen-xl">
          <div className="text-2xl">Project Settings</div>
        </div>
      </div>
      <div className="mx-auto grid w-full max-w-screen-xl items-start gap-6 md:grid-cols-[180px_1fr] md:px-4 lg:grid-cols-[250px_1fr]">
        <nav className="hidden gap-4 text-sm text-muted-foreground md:grid">
          {navigation.map(({ name, href }) => (
            <Link key={name} {...getLinkProps(href(projectId))}>
              {name}
            </Link>
          ))}
        </nav>
        <div className="grid gap-6">{props.children}</div>
      </div>
    </div>
  );
}

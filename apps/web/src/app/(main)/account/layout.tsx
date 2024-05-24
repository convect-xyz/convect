"use client";

import { trim } from "lodash";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PropsWithChildren } from "react";
import { cn } from "~/lib/utils";

export default function Layout(props: PropsWithChildren) {
  return (
    <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 p-4 md:gap-8 md:p-10">
      <Main {...props} />
    </main>
  );
}

function Main(props: PropsWithChildren) {
  const pathname = usePathname();

  const getLinkProps = (route: string) => {
    const isLinked = trim(route, "/") === trim(pathname, "/");

    return {
      className: cn(
        "text-muted-foreground",
        isLinked && " text-primary font-bold",
      ),
      href: route,
    };
  };

  return (
    <>
      <div className="mx-auto grid w-full max-w-screen-2xl items-start gap-6 md:grid-cols-[180px_1fr] lg:grid-cols-[250px_1fr]">
        <nav className="grid gap-4 text-sm text-muted-foreground">
          <Link {...getLinkProps(`/account/api-keys`)}>API Keys</Link>
        </nav>
        <div className="grid gap-6">{props.children}</div>
      </div>
    </>
  );
}

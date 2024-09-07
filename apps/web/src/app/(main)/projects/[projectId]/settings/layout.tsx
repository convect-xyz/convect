"use client";

import { trim } from "lodash";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { PropsWithChildren } from "react";
import { cn } from "~/lib/utils";
import { useParams } from "../hooks/useParams";

export default function Layout(props: PropsWithChildren) {
  const { projectId } = useParams();

  return (
    <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 p-4 md:gap-8 md:p-10">
      <Main {...props} />
    </main>
  );
}

function Main(props: PropsWithChildren) {
  const pathname = usePathname();
  const { projectId } = useParams();
  const searchParams = useSearchParams();

  const getLinkProps = (route: string) => {
    const isLinked = trim(route, "/") === trim(pathname, "/");

    const params = new URLSearchParams();
    const chainId = searchParams.get("chainId");
    if (chainId) {
      params.set("chainId", chainId);
      route += `?${params}`;
    }

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
        <nav
          className="grid gap-4 text-sm text-muted-foreground"
          x-chunk="dashboard-04-chunk-0"
        >
          <Link {...getLinkProps(`/projects/${projectId}/settings`)}>
            Overview
          </Link>
          <Link
            {...getLinkProps(`/projects/${projectId}/settings/collaborators`)}
          >
            Collaborators
          </Link>
          <Link {...getLinkProps(`/projects/${projectId}/settings/billing`)}>
            Billing
          </Link>
        </nav>
        <div className="grid gap-6">{props.children}</div>
      </div>
    </>
  );
}

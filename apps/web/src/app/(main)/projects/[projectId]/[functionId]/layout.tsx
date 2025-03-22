"use client";

import { trim } from "lodash";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { PropsWithChildren } from "react";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useParams } from "./hooks/useParams";

export default function Layout(props: PropsWithChildren) {
  const { functionId, projectId } = useParams();
  const { data: handler } = api.functions.get.useQuery({
    functionId: functionId,
    projectId,
  });

  const getChildren = () => {
    if (!handler) {
      return <></>;
    }

    return <Main {...props} />;
  };

  return (
    <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col">
      {getChildren()}
    </main>
  );
}

function Main(props: PropsWithChildren) {
  const pathname = usePathname();
  const { functionId, projectId } = useParams();
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
        "text-muted-foreground whitespace-nowrap py-4 px-2 border-b-2 border-transparent",
        isLinked && "text-primary font-bold border-primary",
      ),
      href: route,
    };
  };

  return (
    <>
      <nav className="sticky top-[var(--navbar-height)] z-10 flex h-[50px] max-w-[100vw] gap-4 overflow-x-auto border-b bg-background px-2 text-sm text-muted-foreground md:px-5">
        <Link {...getLinkProps(`/projects/${projectId}/${functionId}`)}>
          Overview
        </Link>
        <Link
          {...getLinkProps(`/projects/${projectId}/${functionId}/transactions`)}
        >
          Transactions
        </Link>
        <Link
          {...getLinkProps(`/projects/${projectId}/${functionId}/deployments`)}
        >
          Deployments
        </Link>
        <Link {...getLinkProps(`/projects/${projectId}/${functionId}/logs`)}>
          Logs
        </Link>
        <Link {...getLinkProps(`/projects/${projectId}/${functionId}/envs`)}>
          Environment Variables
        </Link>
        <Link
          {...getLinkProps(`/projects/${projectId}/${functionId}/settings`)}
        >
          Settings
        </Link>
      </nav>
      <div className="mx-auto w-full">{props.children}</div>
    </>
  );
}

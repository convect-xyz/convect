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
    <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 p-4 md:gap-8 md:p-10">
      {getChildren()}
    </main>
  );
}

function Main(props: PropsWithChildren) {
  const pathname = usePathname();
  const { functionId, projectId } = useParams();
  const searchParams = useSearchParams();
  const { data: handler } = api.functions.get.useQuery({
    functionId,
    projectId,
  });

  const getLinkProps = (route: string) => {
    const isLinked = trim(route, "/") === trim(pathname, "/");

    const params = new URLSearchParams();
    const handlerId = searchParams.get("handlerId");
    if (handlerId) {
      params.set("handlerId", handlerId);
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
          <div className="text-md font-semibold">
            {handler?.project?.name} / {handler?.name}
          </div>
          <Link {...getLinkProps(`/projects/${projectId}/${functionId}`)}>
            Overview
          </Link>
          <Link
            {...getLinkProps(
              `/projects/${projectId}/${functionId}/deployments`,
            )}
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
        <div className="grid gap-6">{props.children}</div>
      </div>
    </>
  );
}

"use client";

import { trim } from "lodash";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PropsWithChildren } from "react";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useParams } from "./hooks/useParams";

export default function Layout(props: PropsWithChildren) {
  const { handlerId, projectId } = useParams();
  const { data: handler } = api.handlers.getHandler.useQuery({
    handlerId: Number(handlerId),
    projectId: Number(projectId),
  });

  const getChildren = () => {
    if (!handler) {
      return <></>;
    }

    if (!handler.isInitialised) {
      return <InitaliseInstructions />;
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
  const { handlerId, projectId } = useParams();
  const { data: handler } = api.handlers.getHandler.useQuery({
    handlerId: Number(handlerId),
    projectId: Number(projectId),
  });

  const getLinkProps = (route: string) => {
    const isLinked = trim(route, "/") === trim(pathname, "/");

    return {
      className: cn(isLinked && " text-primary font-bold"),
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
          <Link {...getLinkProps(`/projects/${projectId}/${handlerId}`)}>
            Overview
          </Link>
          <Link {...getLinkProps(`/projects/${projectId}/${handlerId}/logs`)}>
            Logs
          </Link>
          <Link {...getLinkProps(`/projects/${projectId}/${handlerId}/envs`)}>
            Environment Variables
          </Link>
          <Link
            {...getLinkProps(`/projects/${projectId}/${handlerId}/settings`)}
          >
            Settings
          </Link>
        </nav>
        <div className="grid gap-6">{props.children}</div>
      </div>
    </>
  );
}

function InitaliseInstructions() {
  const { handlerId, projectId } = useParams();
  const { data: handler } = api.handlers.getHandler.useQuery({
    handlerId: Number(handlerId),
    projectId: Number(projectId),
  });
  return (
    <div className="flex flex-col">
      <h2 className="text-2xl">Initialise your new handler</h2>
      <p>
        Run{" "}
        <code>
          yarn ingest deployments {handler?.project.name}/{handler?.name}{" "}
          &lt;src path&gt;
        </code>
      </p>
    </div>
  );
}

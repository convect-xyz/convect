"use client";

import { ChevronsUpDownIcon, PlusCircle, SlashIcon } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import LogoIcon from "~/components/icons/LogoIcon";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";
import { NewProjectDialog } from "./NewProject";

export function NavbarLeading() {
  const pathname = usePathname();

  const { projectId, functionId } = useParams<{
    projectId?: string;
    functionId?: string;
  }>();
  const isApiKeysRoute = pathname === "/account/api-keys";
  const isPendingInvitesRoute = pathname === "/account/invites";

  if (isApiKeysRoute) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/">
          <LogoIcon className="h-6 w-6" />
        </Link>
        <div className="text-md">API Keys</div>
      </div>
    );
  }

  if (isPendingInvitesRoute) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/">
          <LogoIcon className="h-6 w-6" />
        </Link>
        <div className="text-md">Pending Invites</div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-4">
      <Link href="/projects">
        <LogoIcon className="h-6 w-6" />
      </Link>
      {projectId && (
        <SlashIcon className="h-4 w-4 skew-x-[30deg] text-muted-foreground" />
      )}
      {projectId && <ProjectsDropdown />}
      {functionId && (
        <SlashIcon className="h-4 w-4 skew-x-[30deg] text-muted-foreground" />
      )}
      {functionId && <FunctionsDropdown />}
    </div>
  );
}

export function ProjectsDropdown() {
  const { data: projects, isLoading: isLoadingProjects } =
    api.project.getProjects.useQuery();
  const { projectId } = useParams<{ projectId?: string }>();
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const router = useRouter();

  const currentProject = projects?.find((p) => projectId === p.id.toString());

  return (
    <>
      <DropdownMenu>
        {isLoadingProjects ? (
          <Skeleton className="h-9 w-[180px]" />
        ) : (
          <DropdownMenuTrigger asChild className="border-none">
            <Button
              variant="outline"
              className="min-w-[80px] max-w-[180px] items-center justify-between gap-2"
            >
              {currentProject ? (
                <>{currentProject.name}</>
              ) : (
                <>Select a project</>
              )}

              <ChevronsUpDownIcon className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
        )}
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel className="text-xs uppercase text-muted-foreground">
            Projects
          </DropdownMenuLabel>
          {projects?.map((project) => (
            <DropdownMenuItem
              key={project.id}
              onClick={() => router.push(`/projects/${project.id}`)}
            >
              {project.name}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="gap-2"
            onClick={() => setIsNewProjectOpen(true)}
          >
            <PlusCircle size={14} />
            New Project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <NewProjectDialog
        open={isNewProjectOpen}
        onOpenChange={setIsNewProjectOpen}
      />
    </>
  );
}

export function FunctionsDropdown() {
  const { projectId, functionId } = useParams<{
    projectId: string;
    functionId?: string;
  }>();
  const { data: functions, isLoading: isLoadingProjects } =
    api.project.getFunctions.useQuery(
      {
        projectId: Number(projectId),
      },
      {
        select: (data) => data.functions,
      },
    );
  const router = useRouter();
  const currentProject = functions?.find((p) => functionId === p.id.toString());

  return (
    <>
      <DropdownMenu>
        {isLoadingProjects ? (
          <Skeleton className="h-9 w-[180px]" />
        ) : (
          <DropdownMenuTrigger asChild className="border-none">
            <Button
              variant="outline"
              className="min-w-[80px] max-w-[180px] items-center justify-between gap-2"
            >
              {currentProject ? (
                <>{currentProject.name}</>
              ) : (
                <>Select a Function</>
              )}

              <ChevronsUpDownIcon className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
        )}
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel className="text-xs uppercase text-muted-foreground">
            Functions
          </DropdownMenuLabel>
          {functions?.map((fn) => (
            <DropdownMenuItem
              key={fn.id}
              onClick={() => router.push(`/projects/${projectId}/${fn.id}`)}
            >
              {fn.name}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="gap-2" onClick={() => {}}>
            <PlusCircle size={14} />
            New Function
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

export function ProjectsDropdownSkeletion() {
  return <Skeleton className="h-9 w-[180px]" />;
}

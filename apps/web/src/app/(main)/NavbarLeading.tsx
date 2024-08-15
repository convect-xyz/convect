"use client";

import { PlusCircle } from "lucide-react";
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

  return <ProjectsDropdown />;
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
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-[180px] items-center justify-start gap-2"
            >
              <LogoIcon className="h-6 w-6" />
              {currentProject ? (
                <>{currentProject.name}</>
              ) : (
                <>Select a project</>
              )}
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

export function ProjectsDropdownSkeletion() {
  return <Skeleton className="h-9 w-[180px]" />;
}

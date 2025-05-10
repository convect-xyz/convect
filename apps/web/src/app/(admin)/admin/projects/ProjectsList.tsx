"use client";

import { ChevronRight } from "lucide-react";
import { useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { useAdminProjects } from "./hooks/useAdminProjects";

export default function ProjectsList(props: {
  onSelectProject: (projectId: number) => void;
  selectedProjectId?: number;
}) {
  const { ref, inView } = useInView();
  const { data, fetchNextPage, isFetchingNextPage } = useAdminProjects();

  useEffect(() => {
    if (inView && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, isFetchingNextPage, fetchNextPage]);

  return (
    <div>
      <div className="flex flex-col divide-y">
        {data?.pages
          .flatMap((p) => p.projects)
          .map((project) => (
            <button
              key={project.id}
              className="flex p-4"
              onClick={() => props.onSelectProject(project.id)}
            >
              <div className="flex-1 truncate text-left">{project.name}</div>
              <div className="flex items-center gap-2">
                <div className="rounded-full border bg-muted px-2 text-xs text-muted-foreground">
                  {project.planType}
                </div>
                <ChevronRight className="h-4 w-4" />
              </div>
            </button>
          ))}
      </div>
      <div ref={ref} />
    </div>
  );
}

"use client";
import { useState } from "react";
import ProjectDetail from "./ProjectDetail";
import ProjectsList from "./ProjectsList";

export default function PlansPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<number>();

  return (
    <div className="border-t">
      <div className="flex divide-x">
        <div className="sticky h-screen basis-1/6 overflow-y-auto bg-black">
          <ProjectsList
            onSelectProject={setSelectedProjectId}
            selectedProjectId={selectedProjectId}
          />
        </div>
        <div className="min-h-[calc(100vh-100px)] flex-1">
          <ProjectDetail projectId={selectedProjectId} />
        </div>
      </div>
    </div>
  );
}

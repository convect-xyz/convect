"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "../../hooks/useParams";

export default function BackToSettings() {
  const { projectId } = useParams();
  return (
    <div className="flex items-center gap-2 px-4 pb-4 pt-2 md:hidden">
      <Link
        className="flex items-center gap-3 text-sm text-muted-foreground"
        href={`/projects/${projectId}/settings`}
      >
        <ArrowLeft className="h-4 w-4" />
        Settings
      </Link>
    </div>
  );
}

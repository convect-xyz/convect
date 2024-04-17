"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import CreateDeployment from "./CreateDeployment";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  const { data: project } = api.project.getProjectById.useQuery({
    id,
  });

  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Create Deployment</Button>
      <CreateDeployment open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}

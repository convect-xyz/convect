"use client";

import { times } from "lodash";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";
import { RouterOutputs } from "~/trpc/shared";
import CreateHandler from "./CreateHandler";
import { useParams } from "./hooks/useParams";

export default function Page() {
  const { projectId } = useParams();
  const [isOpen, setIsOpen] = useState(false);
  const { data: handlers } = api.handlers.getHandlers.useQuery({
    projectId: Number(projectId),
  });

  return (
    <div className="mx-auto w-full max-w-screen-md">
      <div className="flex flex-col gap-3">
        {/* <div className="flex justify-end">
          <Button onClick={() => setIsOpen(true)}>New Handler</Button>
        </div> */}
        <CreateHandler open={isOpen} onOpenChange={setIsOpen} />

        <div className="flex flex-col gap-2 divide-y rounded-md border bg-muted/20 p-2">
          {!handlers &&
            times(20).map((idx) => <HandlerRowSkeleton key={idx} />)}
          {handlers?.handlers.length === 0 && <NoHandlers />}
          {handlers?.handlers.map((handler) => (
            <HandlerRow key={handler.id} handler={handler} />
          ))}
        </div>
      </div>
    </div>
  );
}

function HandlerRow(props: {
  handler: RouterOutputs["handlers"]["getHandlers"]["handlers"][number];
}) {
  const router = useRouter();
  const { projectId } = useParams();
  return (
    <div
      className="h-20 p-4"
      onClick={() =>
        router.push(`/projects/${projectId}/${props.handler.id.toString()}`)
      }
    >
      {props.handler.name}
    </div>
  );
}

function HandlerRowSkeleton() {
  return <Skeleton className="h-20 w-full" />;
}

function NoHandlers() {
  return (
    <div className="flex items-center justify-center p-8">
      Create a new handler to get started.
    </div>
  );
}

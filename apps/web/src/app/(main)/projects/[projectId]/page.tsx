"use client";

import { times } from "lodash";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ChainIcon from "~/components/icons/ChainIcon";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";
import { RouterOutputs } from "~/trpc/shared";
import CreateHandler from "./CreateHandler";
import { UpgradeDialog } from "./UpgradeDialog";
import { useParams } from "./hooks/useParams";

export default function Page() {
  const { projectId } = useParams();
  const [isOpen, setIsOpen] = useState(false);
  const { data: handlers, isLoading } = api.handlers.getHandlers.useQuery({
    projectId: Number(projectId),
  });

  return (
    <>
      <div className="mx-auto w-full max-w-screen-2xl">
        <div className="mx-auto flex w-full max-w-screen-lg flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="px-2">
              <h3 className="text-sm text-muted-foreground">
                Convect Functions
              </h3>
            </div>

            {handlers && handlers.handlers.length > 0 && (
              <Button onClick={() => setIsOpen(true)}>New</Button>
            )}
            <CreateHandler open={isOpen} onOpenChange={setIsOpen} />
          </div>

          {handlers?.handlers.length === 0 && <NoHandlers />}

          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-2">
            {!handlers &&
              times(20).map((idx) => <HandlerRowSkeleton key={idx} />)}
            {handlers?.handlers.map((handler) => (
              <HandlerRow key={handler.id} handler={handler} />
            ))}
          </div>
        </div>
      </div>
      <UpgradeDialog />
    </>
  );
}

function HandlerRow(props: {
  handler: RouterOutputs["handlers"]["getHandlers"]["handlers"][number];
}) {
  const router = useRouter();
  const { projectId } = useParams();
  return (
    <div
      className="flex h-32 cursor-pointer flex-col rounded-sm border bg-muted p-3 transition-all hover:border-muted-foreground/25"
      onClick={() =>
        router.push(`/projects/${projectId}/${props.handler.id.toString()}`)
      }
    >
      <div className="flex-1">
        <div>{props.handler.name}</div>
        <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
          {props.handler.description}
        </div>
      </div>

      <span className="ml-auto flex w-min items-center gap-2 whitespace-nowrap rounded-full bg-background px-2 py-1 text-xs">
        <ChainIcon chainId={props.handler.producer.chainId} />
        <span>{props.handler.producer.name}</span>
      </span>
    </div>
  );
}

function HandlerRowSkeleton() {
  return <Skeleton className="h-40 w-full" />;
}

function NoHandlers() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center gap-2 py-20">
      <span>You have no Convect Functions</span>
      <Button onClick={() => setIsOpen(true)}>Create Function</Button>
      <CreateHandler open={isOpen} onOpenChange={setIsOpen} />
    </div>
  );
}

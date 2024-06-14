"use client";

import { times } from "lodash";
import { Terminal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CodeBlock } from "~/components/code/CodeBlock";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
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
        <div className="mx-auto flex w-full max-w-screen-lg flex-col gap-3">
          <CreateHandler open={isOpen} onOpenChange={setIsOpen} />

          {handlers?.handlers.length === 0 && <NoHandlers />}
          {(isLoading || (handlers && handlers.handlers.length > 0)) && (
            <>
              <div className="px-2">
                <h3 className="text-sm text-muted-foreground">
                  Convect Functions
                </h3>
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-2">
                {!handlers &&
                  times(20).map((idx) => <HandlerRowSkeleton key={idx} />)}
                {handlers?.handlers.map((handler) => (
                  <HandlerRow key={handler.id} handler={handler} />
                ))}
              </div>
            </>
          )}
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
      className="h-32 cursor-pointer rounded-sm border bg-muted p-4 transition-all hover:border-muted-foreground/25"
      onClick={() =>
        router.push(`/projects/${projectId}/${props.handler.id.toString()}`)
      }
    >
      {props.handler.name}
    </div>
  );
}

function HandlerRowSkeleton() {
  return <Skeleton className="h-40 w-full" />;
}

function NoHandlers() {
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <Alert className="mt-4">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Create a new handler to get started.</AlertTitle>
        <AlertDescription className="mt-4">
          <CodeBlock
            code={"export CONVECT_API_KEY=<your api key>\nnpx convect-xyz init"}
          />
        </AlertDescription>
      </Alert>
    </div>
  );
}

"use client";

import { PropsWithChildren } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import { useParams } from "../hooks/useParams";

export default function Page() {
  return (
    <div>
      <DeleteHandler />
    </div>
  );
}

function DeleteHandler() {
  const { mutateAsync: deleteHandler, isLoading: isDeleting } =
    api.handlers.deleteHandler.useMutation();
  const { handlerId } = useParams();

  return (
    <AlertDialog>
      <Section>
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-xl font-bold">Delete Handler</h2>
            <p className="text-sm text-secondary-foreground">
              Permanently delete this handler.
            </p>
          </div>
          <div>
            <AlertDialogTrigger asChild>
              <Button isLoading={isDeleting}>Delete</Button>
            </AlertDialogTrigger>
          </div>
        </div>
      </Section>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete your
            handler.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>No, thanks</AlertDialogCancel>
          <Button
            onClick={() =>
              deleteHandler({
                handlerId: Number(handlerId),
              })
            }
            isLoading={isDeleting}
            variant="destructive"
          >
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function Section(props: PropsWithChildren) {
  return <div className="border p-4">{props.children}</div>;
}

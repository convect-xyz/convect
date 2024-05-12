"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { formatDistanceToNow } from "date-fns";
import { EyeIcon, EyeOffIcon, MoreHorizontalIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { Form } from "~/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { api } from "~/trpc/react";
import { RouterOutputs } from "~/trpc/shared";
import { useParams } from "../hooks/useParams";
import { AddEnvSection } from "./AddEnvSection";
import { useEnvs } from "./hooks/useEnvs";

export default function Page() {
  const { data } = useEnvs();

  return (
    <div className="flex flex-col gap-4">
      <AddEnvSection />
      {data && <EnvironmentVariables />}
    </div>
  );
}

function EnvironmentVariables() {
  const { data: envs } = useEnvs();

  return (
    <div className="divide-y rounded-sm border">
      {envs && envs.length === 0 && <NoEnvs />}
      {envs?.map((env) => <EnvRow env={env} />)}
    </div>
  );
}

function NoEnvs() {
  return (
    <div className="flex items-center justify-center p-8">
      No environment variables
    </div>
  );
}

function EnvRow({ env }: { env: RouterOutputs["handlers"]["getEnvs"][0] }) {
  const [revealEnv, setRevealEnv] = useState(false);

  return (
    <div className="flex items-center justify-between p-4">
      <div className="w-20">{env.key}</div>
      <div className="flex flex-1 items-center justify-center gap-2">
        <Button variant="ghost" onClick={() => setRevealEnv((v) => !v)}>
          {revealEnv ? <EyeOffIcon /> : <EyeIcon />}
        </Button>
        <div className="w-40">
          {revealEnv ? (
            <div className="w-fit truncate rounded-sm bg-secondary px-1">
              {env.value}
            </div>
          ) : (
            "•••••••••••••"
          )}
        </div>
      </div>
      <div className="flex max-w-40 items-center gap-2">
        <div>
          Last updated{" "}
          {formatDistanceToNow(env.lastUpdatedAt, { addSuffix: true })}
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost">
              <MoreHorizontalIcon />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="flex w-40 flex-col p-1 text-left">
            <Button variant="ghost" className="cursor-pointer justify-start">
              Edit
            </Button>
            <DeleteConfirmation envId={env.id} />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

function DeleteConfirmation(props: { envId: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const { handlerId } = useParams();
  const utils = api.useUtils();
  const { mutateAsync: deleteEnv } = api.handlers.deleteEnv.useMutation();

  const form = useForm({
    resolver: zodResolver(z.object({})),
  });

  const onRemove = async () => {
    await deleteEnv({
      handlerId,
      id: props.envId,
    });
    await utils.handlers.getEnvs.refetch({ handlerId });
    setIsOpen(false);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <Button
        variant="ghost"
        className="cursor-pointer justify-start text-destructive"
        onClick={() => setIsOpen(true)}
      >
        Remove
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            Removing this environment variable cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onRemove)}>
              <Button
                type="submit"
                variant="destructive"
                isLoading={form.formState.isSubmitting}
              >
                Delete
              </Button>
            </form>
          </Form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

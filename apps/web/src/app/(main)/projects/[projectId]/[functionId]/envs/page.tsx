"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { formatDistanceToNow } from "date-fns";
import {
  Code2,
  EyeIcon,
  EyeOffIcon,
  LoaderIcon,
  MoreHorizontalIcon,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { api } from "~/trpc/react";
import { RouterOutputs } from "~/trpc/shared";
import { useParams } from "../hooks/useParams";
import { AddEnvSection } from "./AddEnvSection";
import EditEnvSection from "./EditEnvSection";
import { useEnvs } from "./hooks/useEnvs";

export default function Page() {
  const { data } = useEnvs();

  return (
    <div className="mx-auto max-w-screen-lg py-4">
      <div className="flex flex-col gap-4 overflow-hidden">
        <AddEnvSection />
        {data && <EnvironmentVariables />}
      </div>
    </div>
  );
}

function EnvironmentVariables() {
  const { data: envs } = useEnvs();

  return (
    <div className="divide-y rounded-sm border bg-muted">
      {envs && envs.length === 0 && <NoEnvs />}
      {envs?.map((env) => <EnvRow key={env.id} env={env} />)}
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

function EnvRow({ env }: { env: RouterOutputs["functions"]["getEnvs"][0] }) {
  const { functionId } = useParams();
  const [isCopied, setIsCopied] = useState(false);
  const [show, setShow] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { data: value, isLoading } = api.functions.getEnvValue.useQuery(
    {
      functionId,
      envId: env.id,
    },
    {
      enabled: show,
    },
  );

  const getButtonProps = () => {
    if (isLoading) {
      return {
        onClick: () => setShow(false),
        children: <LoaderIcon className="animate-spin" size={14} />,
      };
    }

    if (show) {
      return {
        children: <EyeOffIcon size={14} />,
        onClick: () => setShow(false),
      };
    }

    return {
      children: <EyeIcon size={14} />,
      onClick: async () => {
        setShow(true);
      },
    };
  };

  const handleCopy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value?.decryptedValue);
    setIsCopied(true);
  };

  const handleTooltipOpenChange = (open: boolean) => {
    if (!open && isCopied) {
      setTimeout(() => setIsCopied(false), 200);
    }
  };

  return (
    <div className="flex flex-col gap-2 p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-muted-foreground">
            <Code2 size={14} className="text-muted-foreground" />
          </div>
        </div>
        <div className="max-w-[200px] flex-1 truncate">{env.key}</div>
        <div className="flex min-w-0 flex-1 items-center justify-start gap-2">
          <Button
            className="h-7 basis-7 p-0"
            variant="ghost"
            {...getButtonProps()}
          />
          <div className="min-w-0 flex-1 text-sm">
            {show && value ? (
              <TooltipProvider>
                <Tooltip onOpenChange={handleTooltipOpenChange}>
                  <TooltipTrigger asChild onClick={(e) => e.preventDefault()}>
                    <button
                      className="flex h-7 min-w-0 max-w-full items-center rounded-sm bg-background px-1"
                      onClick={handleCopy}
                    >
                      <code className="min-w-0 max-w-full truncate">
                        {value.decryptedValue}
                      </code>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    onPointerDownOutside={(e) => e.preventDefault()}
                  >
                    {isCopied ? (
                      <div className="text-xs text-zinc-500">Copied!</div>
                    ) : (
                      <div className="text-xs text-zinc-500">Click to copy</div>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <div className="truncate text-clip">•••••••••••••</div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <div className="text-xs text-muted-foreground">
            Modified{" "}
            {formatDistanceToNow(env.lastUpdatedAt, { addSuffix: true })}
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost">
                <MoreHorizontalIcon />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="flex w-40 flex-col p-1 text-left">
              <Button
                variant="ghost"
                className="cursor-pointer justify-start"
                onClick={() => setIsEditing(true)}
              >
                Edit
              </Button>
              <DeleteConfirmation envId={env.id} />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      {isEditing && (
        <EditEnvSection
          open
          env={env}
          onUpdate={() => setIsEditing(false)}
          onOpenChange={() => setIsEditing(false)}
        />
      )}
    </div>
  );
}

function DeleteConfirmation(props: { envId: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const { functionId } = useParams();
  const utils = api.useUtils();
  const { mutateAsync: deleteEnv } = api.functions.deleteEnv.useMutation({
    onSuccess: () => {
      toast.success("Environment variable removed");
      utils.functions.getEnvs.refetch({ functionId });
    },
  });

  const form = useForm({
    resolver: zodResolver(z.object({})),
  });

  const onRemove = async () => {
    await deleteEnv({
      functionId,
      id: props.envId,
    });
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

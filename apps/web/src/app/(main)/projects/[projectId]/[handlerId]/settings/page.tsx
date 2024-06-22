"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { PropsWithChildren } from "react";
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
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { api } from "~/trpc/react";
import { useParams } from "../hooks/useParams";

export default function Page() {
  const { handlerId } = useParams();
  const { isLoading: isLoadingSettings } = api.functions.getSettings.useQuery({
    handlerId,
  });

  if (isLoadingSettings) return null;

  return (
    <div className="flex flex-col gap-4">
      <FunctionName />
      <FunctionDescription />
      <DeleteHandler />
    </div>
  );
}

function FunctionName() {
  const { handlerId } = useParams();
  const { data: settings } = api.functions.getSettings.useQuery({ handlerId });

  const utils = api.useUtils();
  const form = useForm({
    resolver: zodResolver(
      z.object({
        name: z.string(),
      }),
    ),
    defaultValues: {
      name: settings?.name ?? "",
    },
  });
  const { mutateAsync: changeName, isPending: isSaving } =
    api.functions.updateName.useMutation({
      onSuccess() {
        toast("Updated function name.");
        utils.functions.get.refetch();
        utils.functions.getSettings.refetch();
      },
    });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((v) => changeName({ handlerId, ...v }))}
      >
        <Section>
          <div className="flex flex-col gap-4">
            <div>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xl font-bold">
                      Function Name
                    </FormLabel>
                    <FormDescription>
                      The display name of your function.
                    </FormDescription>
                    <FormControl>
                      <Input
                        className="bg-background"
                        placeholder={"abc"}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div>
              <Button isLoading={isSaving}>Save</Button>
            </div>
          </div>
        </Section>
      </form>
    </Form>
  );
}

function FunctionDescription() {
  const { handlerId } = useParams();
  const { data: settings } = api.functions.getSettings.useQuery({
    handlerId,
  });
  const utils = api.useUtils();

  const form = useForm({
    resolver: zodResolver(
      z.object({
        description: z.string(),
      }),
    ),
    defaultValues: {
      description: settings?.description ?? "",
    },
  });

  const { mutateAsync: changeDescription, isPending: isSaving } =
    api.functions.updateDescription.useMutation({
      onSuccess() {
        toast("Updated function description.");
        utils.functions.getSettings.refetch();
        utils.functions.get.refetch();
      },
    });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((v) =>
          changeDescription({ handlerId, ...v }),
        )}
      >
        <Section>
          <div className="flex flex-col gap-4">
            <div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xl font-bold">
                      Function Description
                    </FormLabel>
                    <FormDescription>
                      The description of your function.
                    </FormDescription>
                    <FormControl>
                      <Textarea
                        placeholder="Provide a useful description of your Convect Function"
                        className="h-24 resize-none bg-background"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div>
              <Button isLoading={isSaving}>Save</Button>
            </div>
          </div>
        </Section>
      </form>
    </Form>
  );
}

function DeleteHandler() {
  const { handlerId, projectId } = useParams();
  const router = useRouter();
  const { mutateAsync: deleteHandler, isPending: isDeleting } =
    api.functions.delete.useMutation({
      onSuccess() {
        router.push(`/projects/${projectId}`);
      },
    });

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
  return <div className="rounded-md border bg-muted p-4">{props.children}</div>;
}

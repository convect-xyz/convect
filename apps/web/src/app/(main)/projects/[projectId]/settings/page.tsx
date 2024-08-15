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
import { api } from "~/trpc/react";
import { useParams } from "../hooks/useParams";

export default function Page() {
  const { projectId } = useParams();
  const { data: project } = api.project.getProjectById.useQuery({
    id: projectId,
  });

  if (!project) {
    return null;
  }
  return (
    <div>
      <div className="flex flex-col gap-4">
        <ProjectName />
        <DeleteProject />
      </div>
    </div>
  );
}

function ProjectName() {
  const { projectId } = useParams();
  const { data: project } = api.project.getProjectById.useQuery({
    id: projectId,
  });

  const utils = api.useUtils();
  const form = useForm({
    resolver: zodResolver(
      z.object({
        name: z.string(),
      }),
    ),
    defaultValues: {
      name: project?.name ?? "",
    },
  });
  const { mutateAsync: changeName, isPending: isSaving } =
    api.project.updateName.useMutation({
      onSuccess() {
        toast("Updated project name.");
        utils.functions.get.refetch();
      },
    });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((v) => changeName({ projectId, ...v }))}
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
                      Project Name
                    </FormLabel>
                    <FormDescription>
                      The display name of your project.
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

function DeleteProject() {
  const { projectId } = useParams();
  const router = useRouter();
  const { mutateAsync: deleteProject, isPending: isDeleting } =
    api.project.delete.useMutation({
      onSuccess() {
        router.push(`/projects/${projectId}`);
      },
    });

  return (
    <AlertDialog>
      <Section>
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-xl font-bold">Delete Project</h2>
            <p className="text-sm text-secondary-foreground">
              Permanently delete this project and all its contents.
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
              deleteProject({
                projectId,
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

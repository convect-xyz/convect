"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { TrashIcon } from "@radix-ui/react-icons";
import { times } from "lodash";
import { ComponentProps, PropsWithChildren, useState } from "react";
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
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import BackToSettings from "../(components)/BackToSettings";
import { useParams } from "../../hooks/useParams";
import { useProject } from "../../hooks/useProject";

export default function Page() {
  return (
    <>
      <BackToSettings />
      <div className="px-4">
        <div className="flex flex-col gap-8">
          <InviteUser />
          <div>
            <div className="mb-2">Collaborators</div>
            <Section>
              <Collaborators />
            </Section>
          </div>
          <div>
            <div className="mb-2">Pending Invites</div>
            <Section className="p-4">
              <PendingInvites />
            </Section>
          </div>
        </div>
      </div>
    </>
  );
}

function InviteUser() {
  const { projectId } = useParams();
  const form = useForm({
    resolver: zodResolver(
      z.object({
        email: z.string().email("Invalid email address"),
      }),
    ),
    defaultValues: {
      email: "",
    },
  });

  const { mutateAsync: inviteCollaborator, isPending: isInvitingCollaborator } =
    api.project.inviteCollaborator.useMutation({
      onSuccess() {
        toast("Invite sent successfully.");
      },
      onError(err) {
        toast.error(err.message);
      },
    });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((v) =>
          inviteCollaborator({
            type: "email",
            projectId,
            email: form.getValues().email,
          }),
        )}
      >
        <Section className="p-4">
          <div className="flex flex-col gap-4">
            <div>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xl font-bold">Email</FormLabel>
                    <FormDescription>
                      Enter the email address of the person you want to invite.
                    </FormDescription>
                    <FormControl>
                      <Input
                        className="bg-background"
                        placeholder="user@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div>
              <Button
                disabled={!form.formState.isValid}
                isLoading={isInvitingCollaborator}
              >
                Invite
              </Button>
            </div>
          </div>
        </Section>
      </form>
    </Form>
  );
}

function PendingInvites() {
  const { projectId } = useParams();
  const { data: pendingInvites } = api.project.getPendingInvites.useQuery({
    projectId: projectId,
  });

  return (
    <div>
      {pendingInvites && pendingInvites.length === 0 && (
        <div className="flex items-center justify-center py-10 text-sm">
          No pending invites.
        </div>
      )}
      {pendingInvites?.map((invite) => (
        <div key={invite.user.id}>{invite.user.email}</div>
      ))}
    </div>
  );
}

function Collaborators() {
  const { projectId } = useParams();
  const { data: project } = useProject();
  const { data: collaborators } = api.project.getCollaborators.useQuery({
    projectId: projectId,
  });

  return (
    <div className="flex flex-col divide-y divide-border">
      {collaborators && collaborators.length === 0 && (
        <div className="flex items-center justify-center py-10 text-sm">
          No collaborators.
        </div>
      )}
      {collaborators?.map((collaborator) => (
        <div
          key={collaborator.user.id}
          className="flex items-center justify-between p-4 text-sm"
        >
          <div>{collaborator.user.email}</div>
          {project && project.isOwner && !collaborator.user.isOwner && (
            <DeleteCollaboratorConfirmation email={collaborator.user.email} />
          )}
        </div>
      ))}
      {!collaborators &&
        times(10).map((v) => (
          <div className="flex items-center justify-between gap-8 p-4 text-sm">
            <Skeleton key={v} className="h-4 flex-1" />
            <Skeleton key={v} className="h-8 w-8" />
          </div>
        ))}
    </div>
  );
}

function DeleteCollaboratorConfirmation(props: { email: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const { projectId } = useParams();
  const utils = api.useUtils();
  const { mutateAsync: removeCollaborator } =
    api.project.removeCollaborator.useMutation({
      onSuccess: () => {
        toast.success("Collaborator removed");
        utils.project.getCollaborators.refetch({ projectId });
      },
    });

  const form = useForm({
    resolver: zodResolver(z.object({})),
  });

  const onRemove = async () => {
    await removeCollaborator({
      projectId,
      email: props.email,
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
        <TrashIcon className="h-5 w-5" />
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This user will no longer have access to this project.
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

function Section({
  children,
  className,
  ...rest
}: PropsWithChildren<ComponentProps<"div">>) {
  return (
    <div className={cn("rounded-md border bg-muted", className)}>
      {children}
    </div>
  );
}

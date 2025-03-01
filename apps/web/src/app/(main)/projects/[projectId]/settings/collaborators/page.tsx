"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ComponentProps, PropsWithChildren } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import BackToSettings from "../(components)/BackToSettings";
import { useParams } from "../../hooks/useParams";

export default function Page() {
  return (
    <>
      <BackToSettings />
      <div className="px-4">
        <div className="flex flex-col gap-4">
          <InviteUser />
          <Tabs defaultValue="collaborators">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="collaborators">Collaborators</TabsTrigger>
              <TabsTrigger value="pending-invites">Pending Invites</TabsTrigger>
            </TabsList>
            <TabsContent value="pending-invites">
              <Section className="p-4">
                <PendingInvites />
              </Section>
            </TabsContent>
            <TabsContent value="collaborators">
              <Section>
                <Collaborators />
              </Section>
            </TabsContent>
          </Tabs>
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
        email: z.string(),
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
              <Button isLoading={isInvitingCollaborator}>Invite</Button>
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
      {pendingInvites?.map((invite) => (
        <div key={invite.user.id}>{invite.user.email}</div>
      ))}
    </div>
  );
}

function Collaborators() {
  const { projectId } = useParams();
  const { data: collaborators } = api.project.getCollaborators.useQuery({
    projectId: projectId,
  });

  return (
    <div className="flex flex-col divide-y divide-border">
      {collaborators?.map((collaborator) => (
        <div key={collaborator.user.id} className="p-4">
          {collaborator.user.email}
        </div>
      ))}
    </div>
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

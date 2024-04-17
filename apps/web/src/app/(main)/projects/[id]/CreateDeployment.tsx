"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { DialogProps } from "@radix-ui/react-dialog";
import { useForm, useFormContext } from "react-hook-form";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogOverlay } from "~/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { api } from "~/trpc/react";
import { useParams } from "./hooks/useParams";

type Props = DialogProps;

export default function CreateDeployment(props: Props) {
  return (
    <Dialog {...props}>
      <DialogOverlay />
      <DialogContent className="max-w-lg px-8">
        <Content />
      </DialogContent>
    </Dialog>
  );
}

const schema = z.object({
  name: z.string(),
  branch: z.string(),
});

type Values = z.infer<typeof schema>;

function Content() {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
  });

  const { id } = useParams();
  const { mutateAsync: createDeployment } =
    api.deployments.createDeployment.useMutation();

  const onSubmit = async (values: Values) => {
    createDeployment({
      projectId: id,
      branch: values.branch,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Deployment Name</FormLabel>
              <FormControl>
                <Input placeholder="Name" {...field} />
              </FormControl>
              <FormDescription>
                This is your public display name.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Branches />
        <Button type="submit">Create Deployment</Button>
      </form>
    </Form>
  );
}

function Branches() {
  const form = useFormContext();
  const { id } = useParams();
  const { data: project } = api.project.getProjectById.useQuery({
    id,
  });
  const { data: branches } = api.github.getBranches.useQuery(
    {
      repositoryId: project?.repositoryId ?? 0,
    },
    {
      enabled: !!project,
    },
  );

  return (
    <FormField
      control={form.control}
      name="branch"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Branch</FormLabel>
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select Branch" />
            </SelectTrigger>
            <SelectContent>
              {branches?.map((branch) => (
                <SelectItem key={branch.name} value={branch.name}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormDescription>Select your branch</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

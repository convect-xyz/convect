"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { DialogProps } from "@radix-ui/react-dialog";
import { useForm } from "react-hook-form";
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
import xZod from "~/lib/shared/validation";
import { api } from "~/trpc/react";
import { useParams } from "./hooks/useParams";

type Props = DialogProps;

export default function CreateHandler(props: Props) {
  return (
    <Dialog {...props}>
      <DialogOverlay />
      <DialogContent className="max-w-lg px-8">
        <Content {...props} />
      </DialogContent>
    </Dialog>
  );
}

const schema = z.object({
  name: xZod.handler,
});

type Values = z.infer<typeof schema>;

function Content(props: Props) {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
  });

  const { projectId } = useParams();
  const utils = api.useUtils();
  const { mutateAsync: createHandler } = api.functions.create.useMutation({
    onSuccess() {
      utils.project.getFunctions.invalidate({
        projectId: Number(projectId),
      });
      props.onOpenChange?.(false);
    },
  });

  const onSubmit = async (values: Values) =>
    createHandler({
      projectId: Number(projectId),
      name: values.name,
    });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-3">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Function Name</FormLabel>
                <FormControl>
                  <Input placeholder="my-new-function" {...field} />
                </FormControl>
                <FormDescription>
                  Only letters, numbers, and hyphens are allowed.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            disabled={form.formState.isSubmitting || !form.formState.isValid}
            className="mt-4"
          >
            Create Function
          </Button>
        </div>
      </form>
    </Form>
  );
}

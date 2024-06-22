"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { DialogProps } from "@radix-ui/react-dialog";
import { useForm, useFormContext } from "react-hook-form";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogTrigger,
} from "~/components/ui/dialog";
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
import xZod from "~/lib/shared/validation";
import { api } from "~/trpc/react";
import { useParams } from "./hooks/useParams";

type Props = DialogProps;

export default function CreateHandler(props: Props) {
  return (
    <Dialog {...props}>
      <DialogTrigger asChild>
        <Button>New</Button>
      </DialogTrigger>
      <DialogOverlay />
      <DialogContent className="max-w-lg px-8">
        <Content {...props} />
      </DialogContent>
    </Dialog>
  );
}

const schema = z.object({
  name: xZod.handler,
  producerId: z.string(),
});

type Values = z.infer<typeof schema>;

function Content(props: Props) {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
  });

  const { projectId } = useParams();
  const utils = api.useUtils();
  const { mutateAsync: createHandler } = api.handlers.createHandler.useMutation(
    {
      onSuccess() {
        utils.handlers.getHandlers.invalidate({
          projectId: Number(projectId),
        });
        props.onOpenChange?.(false);
      },
    },
  );

  const onSubmit = async (values: Values) =>
    createHandler({
      projectId: Number(projectId),
      producerId: Number(values.producerId),
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
                <FormLabel>Handler Name</FormLabel>
                <FormControl>
                  <Input placeholder="my-new-handler" {...field} />
                </FormControl>
                <FormDescription>
                  Only letters, numbers, and hyphens are allowed.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <ChainField />
          <Button
            type="submit"
            disabled={form.formState.isSubmitting || !form.formState.isValid}
            className="mt-4"
          >
            Create Handler
          </Button>
        </div>
      </form>
    </Form>
  );
}

function ChainField() {
  const form = useFormContext<Values>();
  const { data: producers } = api.producers.getProducers.useInfiniteQuery(
    {},
    {
      getNextPageParam(_) {
        return 0;
      },
    },
  );

  return (
    <FormField
      control={form.control}
      name="producerId"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Chain</FormLabel>
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Select a supported chain" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {producers?.pages
                .flatMap((p) => p.producers)
                .map((producer) => (
                  <SelectItem value={producer.id.toString()}>
                    {producer.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

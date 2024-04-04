"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "~/components/ui/dialog";
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

export function NewProducer() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>New</Button>
      </DialogTrigger>
      <DialogContent>
        <CreateProducerForm />
      </DialogContent>
    </Dialog>
  );
}

const schema = z.object({
  wsUrl: z.string(),
  pollingUrl: z.string(),
});

type Values = z.infer<typeof schema>;

function CreateProducerForm() {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
  });
  const { mutateAsync: createProducer } = api.producers.create.useMutation();

  const handleSubmit = async (values: Values) => {
    return createProducer(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <FormField
          control={form.control}
          name="wsUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>WS URL</FormLabel>
              <FormControl>
                <Input placeholder="WS URL" {...field} />
              </FormControl>
              <FormDescription>Websocket URL.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="pollingUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Polling URL</FormLabel>
              <FormControl>
                <Input placeholder="Polling URL" {...field} />
              </FormControl>
              <FormDescription>Polling URL.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit">Create</Button>
      </form>
    </Form>
  );
}

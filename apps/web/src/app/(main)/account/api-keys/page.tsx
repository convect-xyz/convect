"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { DialogProps } from "@radix-ui/react-dialog";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent } from "~/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { api } from "~/trpc/react";

export default function Page() {
  const [open, setIsOpen] = useState(false);

  return (
    <div>
      <Button onClick={() => setIsOpen(true)}>New</Button>
      <ListApiKeys />
      <CreateApiKeyDialog open={open} onOpenChange={setIsOpen} />
    </div>
  );
}

function ListApiKeys() {
  const { data } = api.apiKeys.getApiKeys.useQuery();
  return (
    <div>
      {data?.map((apiKey) => <div key={apiKey.name}>{apiKey.token}</div>)}
    </div>
  );
}

function CreateApiKeyDialog(props: DialogProps) {
  return (
    <Dialog {...props}>
      <DialogContent>
        <Content />
      </DialogContent>
    </Dialog>
  );
}

const schema = z.object({
  name: z.string(),
});
type Values = z.infer<typeof schema>;

function Content() {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
  });
  const { mutateAsync: createApiKey, data: createData } =
    api.apiKeys.createApiKey.useMutation();

  const onSubmit = async (v: Values) => {
    await createApiKey(v);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="API Key Name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {createData && (
          <div>
            <FormLabel>Name</FormLabel>
            <Input value={createData.token} readOnly />
          </div>
        )}

        <Button type="submit">Create</Button>
      </form>
    </Form>
  );
}

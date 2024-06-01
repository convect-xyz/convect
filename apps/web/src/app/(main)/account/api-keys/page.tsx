"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { DialogProps } from "@radix-ui/react-dialog";
import { Terminal } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
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
    <div className="mx-auto w-full max-w-screen-md">
      <div className="text-3xl">API Keys</div>
      <div>API Keys are required when using the Convect CLI.</div>
      <div className="mt-10 flex justify-end">
        <Button onClick={() => setIsOpen(true)}>Create API Key</Button>
      </div>

      <Alert className="mt-4">
        <Terminal className="h-4 w-4" />
        <AlertTitle className="mb-0">Usage</AlertTitle>
        <AlertDescription>
          To set your API Key, add it to your shell environment.{" "}
          <code>export CONVECT_API_KEY=...</code>
        </AlertDescription>
      </Alert>
      <div className="mt-4">
        <ListApiKeys />
      </div>
      <CreateApiKeyDialog open={open} onOpenChange={setIsOpen} />
    </div>
  );
}

function ListApiKeys() {
  const { data } = api.apiKeys.getApiKeys.useQuery();
  return (
    <div className="flex flex-col gap-2 rounded-md">
      {data?.map((apiKey) => (
        <div key={apiKey.name} className="flex rounded-md bg-muted p-4">
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Name</span>
            <span>{apiKey.name}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function CreateApiKeyDialog(props: DialogProps) {
  return (
    <Dialog {...props}>
      <DialogContent>
        <Content {...props} />
      </DialogContent>
    </Dialog>
  );
}

const schema = z.object({
  name: z.string(),
});
type Values = z.infer<typeof schema>;

function Content(props: DialogProps) {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
  });
  const { mutateAsync: createApiKey, data: createData } =
    api.apiKeys.createApiKey.useMutation();

  const onSubmit = async (v: Values) => {
    await createApiKey(v);
  };

  function getButtonProps() {
    if (createData) {
      return {
        type: "button" as const,
        children: "Okay",
        onClick: () => props.onOpenChange?.(false),
      };
    }

    return {
      type: "submit" as const,
      children: "Create",
    };
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input
                    readOnly={!!createData}
                    placeholder="API Key Name"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {createData && (
            <div>
              <FormLabel>Token</FormLabel>
              <Input value={createData.token} readOnly />
            </div>
          )}

          <Button {...getButtonProps()} />
        </div>
      </form>
    </Form>
  );
}

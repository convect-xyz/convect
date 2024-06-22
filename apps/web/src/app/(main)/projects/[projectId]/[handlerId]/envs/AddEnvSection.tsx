import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "~/components/ui/button";
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
import { useParams } from "../hooks/useParams";

const schema = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
});

type Values = z.infer<typeof schema>;
export function AddEnvSection() {
  const { handlerId } = useParams();

  const utils = api.useUtils();
  const { mutateAsync: addEnv } = api.functions.addEnv.useMutation();

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      key: "",
      value: "",
    },
  });

  const onSubmit = async (values: Values) => {
    await addEnv({
      key: values.key,
      value: values.value,
      handlerId,
    });

    await utils.functions.getEnvs.refetch({ handlerId });

    form.reset();
  };

  return (
    <div className="rounded-md border bg-muted p-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex gap-2">
            <FormField
              control={form.control}
              name="key"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Key</FormLabel>
                  <FormControl>
                    <Input
                      className="bg-background"
                      placeholder="Key"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Value</FormLabel>
                  <FormControl>
                    <Input
                      className="bg-background"
                      placeholder="Value"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              type="submit"
              disabled={!form.formState.isValid}
              isLoading={form.formState.isSubmitting}
            >
              Save
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

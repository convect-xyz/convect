"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
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
import { RouterOutputs } from "~/trpc/shared";
import { useParams } from "../hooks/useParams";

const updateEnvSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
});

export default function EditEnvSection({
  env,
  onUpdate,
  open,
  onOpenChange,
}: {
  env: RouterOutputs["functions"]["getEnvs"][0];
  onUpdate: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { functionId } = useParams();
  const { data: envValueData, refetch } = api.functions.getEnvValue.useQuery(
    {
      functionId,
      envId: env.id,
    },
    {
      enabled: false,
    },
  );
  const form = useForm({
    resolver: zodResolver(updateEnvSchema),
    defaultValues: async () => {
      const data = envValueData ?? (await refetch().then((r) => r.data));
      return {
        key: env.key,
        value: data!.decryptedValue,
      };
    },
  });

  const utils = api.useUtils();
  const { mutateAsync: updateEnv } = api.functions.updateEnv.useMutation({
    onSuccess: () => {
      toast.success("Environment variable updated");
      utils.functions.getEnvs.refetch({ functionId });
      utils.functions.getEnvValue.refetch({ functionId, envId: env.id });
    },
  });

  const onSubmit = async (data: z.infer<typeof updateEnvSchema>) => {
    await updateEnv({
      functionId,
      id: env.id,
      newKey: data.key,
      newValue: data.value,
    });
    onUpdate();
    onOpenChange(false);
  };

  if (!open) return <></>;

  return (
    <>
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
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="ghost"
              type="button"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
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
    </>
  );
}

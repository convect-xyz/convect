import { zodResolver } from "@hookform/resolvers/zod";
import { DialogProps } from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
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

export function NewProjectDialog(props: DialogProps) {
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

function Content(props: DialogProps) {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
  });
  const router = useRouter();

  const utils = api.useUtils();
  const { mutateAsync: createProject, isPending: isCreatingProject } =
    api.project.create.useMutation({
      onSuccess() {
        utils.project.getProjects.invalidate();
      },
    });

  const onSubmit = async (values: Values) => {
    const project = await createProject({
      name: values.name,
    });
    router.push(`/projects/${project.id}`);
    props.onOpenChange?.(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project Name</FormLabel>
                <FormControl>
                  <Input placeholder="Name" {...field} />
                </FormControl>
                <FormDescription>
                  Only letters, numbers, and hyphens are allowed.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" isLoading={isCreatingProject}>
            Create
          </Button>
        </div>
      </form>
    </Form>
  );
}

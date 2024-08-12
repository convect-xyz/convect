import { DialogProps } from "@radix-ui/react-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { api } from "~/trpc/react";
import InvocationRow from "./(components)/InvocationRow";
import { useParams } from "./hooks/useParams";

export default function InvocationDialog(
  props: DialogProps & {
    transactionHash: string;
  },
) {
  const { chainId: handlerId } = useParams();
  const { data: response } = api.functions.getInvocations.useQuery(
    {
      transactionHash: props.transactionHash,
      handlerId: handlerId ?? -1,
    },
    {
      enabled: !!handlerId,
    },
  );

  return (
    <Dialog {...props}>
      <DialogContent className="max-w-screen-lg">
        <DialogHeader>
          <DialogTitle>Invocations</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {response?.invocations.map((invocation) => (
            <InvocationRow tx={invocation} key={invocation.id.toString()} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

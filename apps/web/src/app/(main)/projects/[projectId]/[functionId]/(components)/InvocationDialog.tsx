import { DialogProps } from "@radix-ui/react-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { api } from "~/trpc/react";
import { useParams } from "../hooks/useParams";
import InvocationRow from "./InvocationRow";

export default function InvocationDialog(
  props: DialogProps & {
    transactionHash: string;
  },
) {
  const { chainId, functionId } = useParams();
  const { data: response } = api.functions.getInvocations.useQuery(
    {
      transactionHash: props.transactionHash,
      chainId: chainId ?? -1,
      functionId: functionId,
    },
    {
      enabled: !!chainId && !!functionId,
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

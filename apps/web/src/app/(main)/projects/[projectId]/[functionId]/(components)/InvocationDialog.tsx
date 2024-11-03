import { Manifest } from "@convect-xyz/lib";
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
    manifest: Manifest;
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
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Invocations</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground">
          Transaction Hash: {props.transactionHash.substring(0, 10)}...
          {props.transactionHash.substring(props.transactionHash.length - 10)}
        </div>
        <div>
          <div className="flex flex-col rounded-md border px-3 py-1">
            {response?.invocations.map((invocation) => (
              <InvocationRow
                tx={invocation}
                key={invocation.id.toString()}
                manifest={props.manifest}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

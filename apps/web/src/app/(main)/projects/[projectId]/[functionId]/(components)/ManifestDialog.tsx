import { DialogProps } from "@radix-ui/react-dialog";
import ChainIcon from "~/components/icons/ChainIcon";
import { Card, CardContent } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { getStructuredManifest, Manifest } from "~/lib/shared/manifest";

export default function ManifestDialog(
  props: DialogProps & {
    manifest: Manifest;
  },
) {
  return (
    <Dialog {...props}>
      <DialogContent className="max-h-[98%] max-w-screen-lg overflow-hidden">
        <DialogHeader>
          <DialogTitle>Manifest</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto">
          <RenderManifest manifest={props.manifest} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RenderManifest(props: { manifest: Manifest }) {
  const structuredManifest = getStructuredManifest(props.manifest);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-1">
            {structuredManifest.chains.map((c) => (
              <Card className="w-auto rounded-full">
                <CardContent className="flex items-center gap-2 px-2 py-1">
                  <ChainIcon chainId={c.chainId} />
                  <div className="text-xs text-muted-foreground">{c.name}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2">
        <div className="text-sm uppercase text-muted-foreground">
          Transaction Configurations
        </div>
        <div>
          {structuredManifest.txConfigs.map((txConfig) => (
            <Card>
              <CardContent className="p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="rounded-full border px-2 py-1 text-xs">
                      <span className="text-muted-foreground">
                        Start Block /{" "}
                      </span>
                      {txConfig.startBlock}
                    </div>
                  </div>
                  <div className="mt-3">
                    {txConfig.logConfigs.map((logConfig) => (
                      <div key={logConfig.topics.join(",")}>
                        {typeof logConfig.address === "string"
                          ? logConfig.address
                          : Object.keys(logConfig.address).join(", ")}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

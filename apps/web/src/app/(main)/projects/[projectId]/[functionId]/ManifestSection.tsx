"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import ManifestDialog from "./(components)/ManifestDialog";
import { useOverview } from "./hooks/useOverview";
import { useParams } from "./hooks/useParams";

function ManifestSection() {
  const [isOpen, setIsOpen] = useState(false);
  const { chainId } = useParams();
  const { data: overview } = useOverview();

  if (!overview) {
    return null;
  }

  return (
    <>
      <Button variant="outline" onClick={() => setIsOpen(true)}>
        View Manifest
      </Button>
      <ManifestDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        initialChainId={chainId ?? undefined}
        manifest={overview.manifest}
      />
    </>
  );
}

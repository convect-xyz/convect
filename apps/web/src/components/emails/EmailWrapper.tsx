import { Body, Head, Html, Tailwind } from "@react-email/components";
import * as React from "react";
import tailwindConfig from "../../../tailwind.config";

import { PropsWithChildren } from "react";

export function EmailWrapper(
  props: PropsWithChildren<{
    preview: React.ReactNode;
  }>,
) {
  return (
    <Html>
      <Head />
      {props.preview}
      <Tailwind config={tailwindConfig}>
        <Body className="bg-background font-sans text-white">
          {props.children}
        </Body>
      </Tailwind>
    </Html>
  );
}

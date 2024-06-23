import { FullLogoIcon } from "@convect-xyz/components";
import { DocsLayout } from "fumadocs-ui/layout";
import { RootProvider } from "fumadocs-ui/provider";
import "fumadocs-ui/twoslash.css";
import { Manrope } from "next/font/google";
import type { ReactNode } from "react";
import "./global.css";
import { pageTree } from "./source";

const manrope = Manrope({
  subsets: ["latin"],
});

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={manrope.className}>
      <body>
        <RootProvider>
          <DocsLayout
            tree={pageTree}
            nav={{ title: <FullLogoIcon className="text-white h-[20px]" /> }}
          >
            {children}
          </DocsLayout>
        </RootProvider>
      </body>
    </html>
  );
}

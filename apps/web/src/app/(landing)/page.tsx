import { signIn } from "~/auth";
import { Button } from "~/components/ui/button";

import React from "react";
import { CodeBlock, FrameCodeBlock } from "~/components/code/CodeBlock";
import { BorderBeam } from "~/components/magicui/border-beam/BorderBeam";
import { getDocsUrl } from "~/lib/shared/validation";

const c = `import { db } from "../db/db";
import { log, transaction } from "@convect-xyz/sdk";

export const transfer = transaction({
  logs: [
    log({
      origin: "0x10fe37bac405b209f83ff523fb8d00c0c3f508a8",
      signature: "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
    })
  ],
  handler: async (transactions) => {
    await db.activity.createMany({
      data: transactions.flatMap(tx => tx.logs).map((log) => ({
        from: log.args.from,
        to: log.args.to,
        tokenId: log.args.tokenId
      }))
    })
  }
});

`;

const ingestCode = `import { transfer } from "./handlers/transfer";
import { revoke } from "./handlers/revoke";
import { ingest } from "@convect-xyz/sdk";

export default ingest({
  revoke,
  transfer
});
`;

export default function Page() {
  return (
    <>
      <section className="mx-auto mt-8 min-h-screen max-w-screen-lg bg-background">
        <div className="z-10">
          <div className="container mx-auto px-4 md:px-6 lg:px-8">
            <div className="-mt-16 flex min-h-screen flex-col items-center justify-center gap-8">
              <h1 className="text-center text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                Serverless transaction processing for Ethereum Networks
              </h1>
              <div className="relative rounded-md">
                <CodeBlock code="npx @convect-xyz/cli init" />
                <BorderBeam
                  size={80}
                  duration={6}
                  delay={4}
                  colorFrom="#FFF"
                  colorTo="#FFF"
                />
              </div>

              <div className="flex gap-2">
                <form
                  action={async () => {
                    "use server";
                    await signIn("github", { redirectTo: "/projects" });
                  }}
                >
                  <Button
                    type="submit"
                    disabled={process.env.NODE_ENV === "production"}
                  >
                    Join Waitlist
                  </Button>
                </form>
                <Button asChild>
                  <a href={getDocsUrl()} target="_blank">
                    View Documentation
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="py-12 md:py-16 lg:py-20">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-3">
              <BoltIcon className="h-8 w-8 text-gray-600 dark:text-gray-400" />
              <h3 className="text-xl font-semibold">Low Latency</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Transactions from new blocks are sent to your handlers almost
                instantly.
              </p>
            </div>
            <div className="space-y-3">
              <CogIcon className="h-8 w-8 text-gray-600 dark:text-gray-400" />
              <h3 className="text-xl font-semibold">High Throughput</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Your handlers can be sent up to 600 transactions per invocation.
              </p>
            </div>
            <div className="space-y-3">
              <BarChartIcon className="h-8 w-8 text-gray-600 dark:text-gray-400" />
              <h3 className="text-xl font-semibold">Advanced Analytics</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Gain valuable insights into your application's performance with
                our comprehensive analytics tools.
              </p>
            </div>
            <div className="space-y-3">
              <PuzzleIcon className="h-8 w-8 text-gray-600 dark:text-gray-400" />
              <h3 className="text-xl font-semibold">Seamless Integration</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Easily integrate our platform with your existing tools and
                workflows for a seamless experience.
              </p>
            </div>
            <div className="space-y-3">
              <ClipboardIcon className="h-8 w-8 text-gray-600 dark:text-gray-400" />
              <h3 className="text-xl font-semibold">Intuitive Dashboards</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Stay on top of your application's performance with our
                user-friendly dashboards.
              </p>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto flex max-w-[1920px] overflow-hidden px-8 py-12 md:py-16 lg:py-20">
        <div className="flex flex-[2_2_0]  flex-col justify-center gap-4">
          <div className="text-4xl font-bold">Full flexibility</div>
          <div className="text-lg text-muted-foreground">
            Define transaction handlers in code and process them however you
            like with full typesafety.
          </div>
        </div>
        <div className="flex-[3_3_0] translate-x-[10%]">
          <FrameCodeBlock fileName="transfer.ts" code={c} />
        </div>
      </section>
      <section className="mx-auto flex max-w-[1920px] flex-row-reverse overflow-hidden px-8 py-12 md:py-16 lg:py-20">
        <div className="flex flex-[2_2_0] flex-col justify-center gap-4 px-8 text-right">
          <div className="text-4xl font-bold">Combine handlers</div>
          <div className="text-lg text-muted-foreground">
            If you intend to process multiple transactions, just pass in
            multiple handlers and we'll make sure they get processed in order.
          </div>
        </div>
        <div className="flex-[3_3_0]">
          <FrameCodeBlock fileName="ingest.ts" code={ingestCode} />
        </div>
      </section>
    </>
  );
}

function BarChartIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" x2="12" y1="20" y2="10" />
      <line x1="18" x2="18" y1="20" y2="4" />
      <line x1="6" x2="6" y1="20" y2="16" />
    </svg>
  );
}

function BoltIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}

function ClipboardIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    </svg>
  );
}

function CogIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" />
      <path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
      <path d="M12 2v2" />
      <path d="M12 22v-2" />
      <path d="m17 20.66-1-1.73" />
      <path d="M11 10.27 7 3.34" />
      <path d="m20.66 17-1.73-1" />
      <path d="m3.34 7 1.73 1" />
      <path d="M14 12h8" />
      <path d="M2 12h2" />
      <path d="m20.66 7-1.73 1" />
      <path d="m3.34 17 1.73-1" />
      <path d="m17 3.34-1 1.73" />
      <path d="m11 13.73-4 6.93" />
    </svg>
  );
}

function MountainIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
    </svg>
  );
}

function PuzzleIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.61a2.404 2.404 0 0 1-1.705.707 2.402 2.402 0 0 1-1.704-.706l-1.568-1.568a1.026 1.026 0 0 0-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 1 1-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 0 0-.289-.877l-1.568-1.568A2.402 2.402 0 0 1 1.998 12c0-.617.236-1.234.706-1.704L4.23 8.77c.24-.24.581-.353.917-.303.515.077.877.528 1.073 1.01a2.5 2.5 0 1 0 3.259-3.259c-.482-.196-.933-.558-1.01-1.073-.05-.336.062-.676.303-.917l1.525-1.525A2.402 2.402 0 0 1 12 1.998c.617 0 1.234.236 1.704.706l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.968a2.5 2.5 0 1 1 3.237 3.237c-.464.18-.894.527-.967 1.02Z" />
    </svg>
  );
}

function ShieldCheckIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

import { signIn } from "~/auth";
import { Button } from "~/components/ui/button";

import {
  ChartSplineIcon,
  CircleDollarSignIcon,
  Code2Icon,
  Rows4Icon,
} from "lucide-react";
import { ComponentProps } from "react";
import { CodeBlock } from "~/components/code/CodeBlock";
import { BorderBeam } from "~/components/magicui/border-beam/BorderBeam";
import { getDocsUrl } from "~/lib/shared/validation";

type SvgProps = ComponentProps<typeof CircleDollarSignIcon>;

const features = [
  {
    icon: (props: SvgProps) => <CircleDollarSignIcon {...props} />,
    title: <div className="text-2xl font-bold">Cost Efficient</div>,
    description: (
      <div className="text-sm">
        <p>
          Convect uses serverless architecture to reduce costs and increase
          scalability. Pay for only what you use.
        </p>
      </div>
    ),
  },

  {
    icon: (props: SvgProps) => <Rows4Icon {...props} />,
    title: <div className="text-2xl font-bold">Batch Processing</div>,
    description: (
      <div className="text-sm">
        <p>
          Processing transactions in batches allows for more efficient use of
          your resources. Convect can process multiple transactions at once,
          reducing the overhead of handling each transaction individually.
        </p>
      </div>
    ),
  },

  {
    icon: (props: SvgProps) => <ChartSplineIcon {...props} />,
    title: <div className="text-2xl font-bold">Scalable</div>,
    description: (
      <div className="text-sm">
        <p>
          Each batch can contain up to 60 transactions to handle peak loads when
          the blockchain is busy.
        </p>
      </div>
    ),
  },

  {
    icon: (props: SvgProps) => <Code2Icon {...props} />,
    title: <div className="text-2xl font-bold">Developer Experience</div>,
    description: (
      <div className="text-sm">
        <p>
          Convect offers a simple and intuitive API for developers to process
          transactions with just a few lines of code.
        </p>
      </div>
    ),
  },
];
export default function Page() {
  return (
    <div>
      <section className="mx-auto mt-8 min-h-screen max-w-screen-lg bg-background">
        <div className="z-10">
          <div className="container mx-auto px-4 md:px-6 lg:px-8">
            <div className="-mt-16 flex min-h-screen flex-col items-center justify-center gap-8">
              <h1 className="text-center text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                Serverless transaction processing for Ethereum Networks
              </h1>
              <div className="relative rounded-md">
                <CodeBlock code="npx convect-xyz init" />
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
                  <Button type="submit">Join Waitlist</Button>
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

      <section className="mx-auto mt-8 w-full max-w-screen-lg bg-background px-4 pb-20">
        <div className="border-2 border-white">
          <div className="grid auto-rows-fr grid-cols-1 sm:grid-cols-2">
            {features.map((feature, i) => (
              <div
                key={i}
                className="flex h-full w-full flex-col gap-2 border-b border-white p-6 last:border-b-0 sm:border-b sm:border-r sm:last:border-b-0 sm:even:border-r-0 sm:[&:nth-last-child(-n+2)]:border-b-0"
              >
                <div className="flex h-full flex-col gap-2">
                  <div className="flex h-10 w-10 items-center justify-center border-2 border-white p-2">
                    {<feature.icon />}
                  </div>
                  <div>{feature.title}</div>
                  <div className="flex-1 text-muted-foreground">
                    {feature.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

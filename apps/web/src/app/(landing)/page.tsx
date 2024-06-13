import { signIn } from "~/auth";
import { Button } from "~/components/ui/button";

import { CodeBlock } from "~/components/code/CodeBlock";
import { BorderBeam } from "~/components/magicui/border-beam/BorderBeam";
import { getDocsUrl } from "~/lib/shared/validation";

export default function Page() {
  return (
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
  );
}

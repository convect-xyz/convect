import { signIn } from "~/auth";
import { Button } from "~/components/ui/button";

export default function Page() {
  return (
    <div className="h-full">
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <h2 className="text-3xl text-white">
          Serverless data processing for Web3
        </h2>

        <form
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: "/projects" });
          }}
        >
          <Button type="submit">Join Waitlist</Button>
        </form>
      </div>
    </div>
  );
}

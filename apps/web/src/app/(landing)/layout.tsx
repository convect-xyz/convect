import { PropsWithChildren } from "react";

import { signIn } from "~/auth";
import { Button } from "~/components/ui/button";
import Auth from "./Auth";

import Link from "next/link";
import FullLogoIcon from "~/components/icons/FullLogoIcon";
import ContactDialog from "./ContactDialog";

export default function Layout(props: PropsWithChildren) {
  return (
    <Auth>
      <header className="mx-auto flex max-w-screen-lg items-center justify-between px-4 py-3 md:px-6 md:py-4 lg:px-8 lg:py-5">
        <Link className="flex items-center" href="/">
          <FullLogoIcon className="h-6" />
        </Link>
        <nav className="hidden items-center space-x-4 justify-self-center md:flex">
          <Link className="text-sm font-medium hover:underline" href="/pricing">
            Pricing
          </Link>
          <ContactDialog />
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
              Sign In
            </Button>
          </form>
        </nav>
      </header>
      <main className="min-h-screen">{props.children}</main>
      <footer className="bg-muted py-6">
        <div className="container mx-auto flex flex-col items-center justify-between px-4 md:flex-row md:px-6 lg:px-8">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            © 2024 Convect Technologies Limited. All rights reserved.
          </p>
          <div className="mt-4 flex space-x-4 md:mt-0">
            <Link className="text-sm font-medium hover:underline" href="#">
              Privacy
            </Link>
            <Link className="text-sm font-medium hover:underline" href="#">
              Terms
            </Link>
            <Link className="text-sm font-medium hover:underline" href="#">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </Auth>
  );
}

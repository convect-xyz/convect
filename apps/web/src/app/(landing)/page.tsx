import { signIn } from "~/auth";
import { Button } from "~/components/ui/button";

import Link from "next/link";
import React from "react";
import LogoIcon from "~/components/icons/LogoIcon";

export default function Page() {
  return (
    <>
      <header className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 lg:px-8 lg:py-5">
        <Link className="flex items-center" href="#">
          <LogoIcon className="h-6 w-6" />
          <span className="ml-2 text-lg font-semibold">convect</span>
        </Link>
        <nav className="hidden space-x-4 md:flex">
          <Link className="text-sm font-medium hover:underline" href="#">
            Features
          </Link>
          <Link className="text-sm font-medium hover:underline" href="#">
            Pricing
          </Link>
          <Link className="text-sm font-medium hover:underline" href="#">
            About
          </Link>
          <Link className="text-sm font-medium hover:underline" href="#">
            Contact
          </Link>
        </nav>
        <Button>Get Started</Button>
      </header>
      <main>
        <section className="bg-gray-100 py-12 md:py-16 lg:py-20">
          <div className="container mx-auto px-4 md:px-6 lg:px-8">
            <div className="grid items-center gap-8 md:grid-cols-2">
              <div className="space-y-4">
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                  Unlock Your Team's Potential
                </h1>
                <p className="text-gray-600 dark:text-gray-400 md:text-lg">
                  Streamline your workflow and focus on what matters most with
                  our powerful platform.
                </p>
                <form
                  action={async () => {
                    "use server";
                    await signIn("github", { redirectTo: "/projects" });
                  }}
                >
                  <Button type="submit">Join Waitlist</Button>
                </form>
              </div>
              <img
                alt="Hero Image"
                className="mx-auto rounded-lg"
                height="400"
                src="/placeholder.svg"
                style={{
                  aspectRatio: "600/400",
                  objectFit: "cover",
                }}
                width="600"
              />
            </div>
          </div>
        </section>
        <section className="py-12 md:py-16 lg:py-20">
          <div className="container mx-auto px-4 md:px-6 lg:px-8">
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-3">
                <BoltIcon className="h-8 w-8 text-gray-600 dark:text-gray-400" />
                <h3 className="text-xl font-semibold">Rapid Deployment</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Get your application up and running in no time with our
                  streamlined deployment process.
                </p>
              </div>
              <div className="space-y-3">
                <CogIcon className="h-8 w-8 text-gray-600 dark:text-gray-400" />
                <h3 className="text-xl font-semibold">
                  Scalable Infrastructure
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Easily scale your application to meet growing demand without
                  worrying about infrastructure.
                </p>
              </div>
              <div className="space-y-3">
                <BarChartIcon className="h-8 w-8 text-gray-600 dark:text-gray-400" />
                <h3 className="text-xl font-semibold">Advanced Analytics</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Gain valuable insights into your application's performance
                  with our comprehensive analytics tools.
                </p>
              </div>
              <div className="space-y-3">
                <ShieldCheckIcon className="h-8 w-8 text-gray-600 dark:text-gray-400" />
                <h3 className="text-xl font-semibold">Secure by Design</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Rest easy knowing your application is protected by
                  industry-leading security measures.
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
        <section className="bg-gray-100 py-12 md:py-16 lg:py-20">
          <div className="container mx-auto px-4 md:px-6 lg:px-8">
            <div className="grid items-center gap-8 md:grid-cols-2">
              <img
                alt="Collaboration Image"
                className="mx-auto rounded-lg"
                height="400"
                src="/placeholder.svg"
                style={{
                  aspectRatio: "600/400",
                  objectFit: "cover",
                }}
                width="600"
              />
              <div className="space-y-4">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                  Collaborate with Ease
                </h2>
                <p className="text-gray-600 dark:text-gray-400 md:text-lg">
                  Our platform makes it easy for your team to work together
                  seamlessly, no matter where they are.
                </p>
                <Button>Learn More</Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="bg-gray-100 py-6 dark:bg-gray-800">
        <div className="container mx-auto flex flex-col items-center justify-between px-4 md:flex-row md:px-6 lg:px-8">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            © 2024 Acme Platform. All rights reserved.
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

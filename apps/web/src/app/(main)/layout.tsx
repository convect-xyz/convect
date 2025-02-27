import { PropsWithChildren } from "react";

import Link from "next/link";
import { auth, signOut } from "~/auth";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import Auth from "./Auth";
import { Navbar } from "./Navbar";
import { NavbarLeading } from "./NavbarLeading";

export default function Layout(props: PropsWithChildren) {
  return (
    <Auth>
      <div className="flex min-h-screen w-full flex-col">
        <header className="sticky top-0 z-10 flex flex-col gap-4 bg-background">
          <div className="flex h-[var(--navbar-height)] items-center justify-between gap-4 border-b px-2 py-2 md:px-6">
            <NavbarLeading />
            <Profile />
          </div>
          <Navbar />
        </header>
        <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-background md:gap-8">
          {props.children}
        </main>
      </div>
    </Auth>
  );
}

async function Profile() {
  const session = await auth();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button>
          <Avatar>
            <AvatarFallback>
              {session!.user.name?.charAt(0) ?? "A"}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/account/api-keys">Settings</Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="bg-background" />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
              className="w-full"
            >
              <button type="submit" className="w-full text-left">
                Sign out
              </button>
            </form>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

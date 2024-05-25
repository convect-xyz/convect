import { PropsWithChildren } from "react";

import Link from "next/link";
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
import { NavbarLeading } from "./NavbarLeading";

export default function Layout(props: PropsWithChildren) {
  return (
    <Auth>
      <div className="flex min-h-screen w-full flex-col">
        <header className="sticky top-0 flex items-center justify-between gap-4 border-b bg-background px-4 py-2 md:px-6">
          <NavbarLeading />
          <Profile />
        </header>
        <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-background p-4 md:gap-8 md:p-10">
          {props.children}
        </main>
      </div>
    </Auth>
  );
}

function Profile() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button>
          <Avatar>
            <AvatarFallback>US</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/account/api-keys">API Keys</Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

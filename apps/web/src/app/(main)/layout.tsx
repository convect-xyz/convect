import { PropsWithChildren, Suspense } from "react";
import { SidebarItemDefinition } from "~/components/sidebar/SidebarItem";

import Auth from "./Auth";
import {
  ProjectsDropdown,
  ProjectsDropdownSkeletion,
} from "./ProjectsDropdown";

const routes: Array<SidebarItemDefinition> = [
  {
    name: "Producers",
    route: "/producers",
  },
];

export default function Layout(props: PropsWithChildren) {
  return (
    <Auth>
      <div className="flex min-h-screen w-full flex-col">
        <header className="sticky top-0 flex flex-col gap-4 border-b bg-background px-4 py-2 md:px-6">
          <Suspense fallback={<ProjectsDropdownSkeletion />}>
            <ProjectsDropdown />
          </Suspense>
        </header>
        <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-background p-4 md:gap-8 md:p-10">
          {props.children}
        </main>
      </div>
    </Auth>
  );
}

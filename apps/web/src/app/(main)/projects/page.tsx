import { redirect } from "next/navigation";
import { caller } from "~/trpc/server";

export default async function Page(props: {
  searchParams: Record<string, any>;
}) {
  const projects = await caller.project.getProjects();
  var firstProjectId = projects.at(0)?.id;

  if (!firstProjectId) {
    firstProjectId = await caller.project
      .create({
        name: "default",
      })
      .then((p) => p.id);
  }

  console.log(firstProjectId);
  const p = new URLSearchParams(props.searchParams);

  return redirect(`/projects/${firstProjectId}?${p.toString()}`);
}

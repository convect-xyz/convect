import { redirect } from "next/navigation";
import { api } from "~/trpc/server";

export default async function Page() {
  const projects = await api.project.getProjects.query();
  var firstProjectId = projects.at(0)?.id;

  if (!firstProjectId) {
    firstProjectId = await api.project.create
      .mutate({
        name: "default",
      })
      .then((p) => p.id);
  }

  return redirect(`/projects/${firstProjectId}`);
}

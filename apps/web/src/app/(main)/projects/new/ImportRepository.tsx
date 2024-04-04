"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { env } from "~/env";
import { api } from "~/trpc/react";
import { RouterOutputs } from "~/trpc/shared";

export function ImportRepository() {
  const [currentInstallation, setCurrentInstallation] = useState<number>();

  const { data: installations } = api.project.getInstallations.useQuery();
  const { data: repositories } = api.project.getRepositories.useQuery(
    { installationId: currentInstallation! },
    {
      enabled: !!currentInstallation,
    },
  );

  return (
    <div className="mt-10 rounded-md border p-2">
      <div className="flex gap-2">
        <Select
          value={currentInstallation?.toString()}
          onValueChange={(v) => setCurrentInstallation(Number(v))}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select Account" />
          </SelectTrigger>
          <SelectContent>
            {installations?.map((installation) => (
              <SelectItem value={installation.id.toString()}>
                {installation.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={() =>
            window.open(
              `https://github.com/apps/${env.NEXT_PUBLIC_APP_NAME}/installations/new?state=1234`,
              "newwindow",
              "width=650,height=1400",
            )
          }
        >
          Add New
        </Button>
      </div>

      <div>
        {repositories?.map((repo) => (
          <RepositoryRow key={repo.id} repo={repo} />
        ))}
      </div>
    </div>
  );
}

function RepositoryRow(props: {
  repo: RouterOutputs["project"]["getRepositories"][0];
}) {
  const router = useRouter();
  const { repo } = props;
  const { mutateAsync } = api.project.create.useMutation({
    onSuccess(data) {
      return router.push(`/projects/${data.id}`);
    },
  });
  return (
    <div className="flex p-2">
      <div className="flex-1 truncate">{repo.name}</div>
      <Button onClick={() => mutateAsync({ repoName: repo.name })}>
        Import
      </Button>
    </div>
  );
}

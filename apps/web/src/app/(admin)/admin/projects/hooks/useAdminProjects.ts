import { api } from "~/trpc/react";

export function useAdminProjects() {
  return api.admin.getProjects.useInfiniteQuery(
    {},
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    },
  );
}

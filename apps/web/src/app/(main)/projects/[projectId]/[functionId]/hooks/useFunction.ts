import { TRPCClientErrorLike } from "@trpc/client";
import { UseTRPCQueryOptions } from "@trpc/react-query/shared";
import { inferProcedureOutput } from "@trpc/server";
import { api } from "~/trpc/react";
import { AppRouter } from "~/trpc/router";
import { useParams } from "./useParams";

export function useFunction<
  TData = inferProcedureOutput<AppRouter["functions"]["get"]>,
>(
  props?: UseTRPCQueryOptions<
    inferProcedureOutput<AppRouter["functions"]["get"]>,
    TData,
    TRPCClientErrorLike<AppRouter>
  >,
) {
  const { functionId, projectId } = useParams();
  return api.functions.get.useQuery(
    {
      projectId: projectId,
      functionId: functionId,
    },
    {
      refetchInterval: 30000,
      ...props,
    },
  );
}

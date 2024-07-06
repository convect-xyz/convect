import { useParams as _useParams, useSearchParams } from "next/navigation";
import { useParams as useProjectParams } from "../../hooks/useParams";

export function useParams() {
  const projectParams = useProjectParams();
  const searchParams = useSearchParams();
  const params = _useParams<{ functionId: string }>();
  const maybeHandlerId = searchParams.get("handlerId");

  return {
    ...projectParams,
    functionId: Number(params.functionId),
    handlerId: maybeHandlerId ? Number(maybeHandlerId) : null,
  };
}

import { useParams as _useParams } from "next/navigation";
import { useParams as useProjectParams } from "../../hooks/useParams";

export function useParams() {
  const projectParams = useProjectParams();
  const params = _useParams<{ handlerId: string }>();

  return {
    ...projectParams,
    handlerId: Number(params.handlerId),
  };
}

import { useParams as _useParams } from "next/navigation";

export const useParams = () => {
  const { projectId, functionId } = _useParams<{
    projectId: string;
    functionId?: string;
  }>();

  return {
    projectId: Number(projectId),
    functionId: functionId ? Number(functionId) : undefined,
  };
};

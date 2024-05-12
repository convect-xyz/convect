import { useParams as _useParams } from "next/navigation";

export const useParams = () => {
  const { projectId } = _useParams<{ projectId: string }>();

  return {
    projectId: Number(projectId),
  };
};

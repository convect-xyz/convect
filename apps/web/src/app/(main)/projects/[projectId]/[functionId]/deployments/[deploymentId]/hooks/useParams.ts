import { useParams as _useParams } from "next/navigation";

export const useParams = () => {
  const { deploymentId } = _useParams<{
    deploymentId: string;
  }>();

  return {
    deploymentId,
  };
};

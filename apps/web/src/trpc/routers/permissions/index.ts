import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";

export const getCollaborator = async (projectId: number, userId: string) => {
  const collaborator = await db.query.projectCollaborators.findFirst({
    where: (fields, { eq, and }) =>
      and(eq(fields.projectId, projectId), eq(fields.userId, userId)),
  });

  return collaborator ?? null;
};

export const throwIfNotCollaborator = async (
  projectId: number,
  userId: string,
) => {
  const collaborator = await getCollaborator(projectId, userId);
  if (!collaborator) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
  }
};

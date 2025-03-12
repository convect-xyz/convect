import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";

export const getCollaborator = async (projectId: number, userId: string) => {
  const collaborator = await db.query.projectCollaborators.findFirst({
    where: (fields, { eq, and }) =>
      and(eq(fields.projectId, projectId), eq(fields.userId, userId)),
  });

  return collaborator ?? null;
};

export const throwIfNotProjectCollaborator = async ({
  projectId,
  userId,
}: {
  projectId: number;
  userId: string;
}) => {
  const collaborator = await getCollaborator(projectId, userId);
  if (!collaborator) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
  }

  return collaborator;
};

export const throwIfNotProjectOwner = async ({
  projectId,
  userId,
}: {
  projectId: number;
  userId: string;
}) => {
  const project = await db.query.projects.findFirst({
    where: (fields, { eq }) => eq(fields.id, projectId),
  });
  if (!project) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  }

  const collaborator = await getCollaborator(projectId, userId);
  if (!collaborator) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
  }

  if (collaborator.userId !== project.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
  }

  return { project, collaborator };
};

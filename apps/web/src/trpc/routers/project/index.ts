import { createTRPCRouter } from "../../trpc";
import { createProject } from "./create";
import { deleteProject } from "./delete";
import { getCollaborators } from "./getCollaborators";
import { getFunctions } from "./getFunctions";
import { getPendingInvites } from "./getPendingInvites";
import { getProjectById } from "./getProjectById";
import { getProjects } from "./getProjects";
import { inviteCollaborator } from "./inviteCollaborator";
import { updateName } from "./updateName";

export const projectRouter = createTRPCRouter({
  create: createProject,
  delete: deleteProject,
  getProjects: getProjects,
  getProjectById,
  getFunctions,
  updateName,
  inviteCollaborator,
  getPendingInvites,
  getCollaborators,
});

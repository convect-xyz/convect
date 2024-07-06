import { createTRPCRouter } from "../../trpc";
import { createProject } from "./create";
import { deleteProject } from "./delete";
import { getFunctions } from "./getFunctions";
import { getProjectById } from "./getProjectById";
import { getProjects } from "./getProjects";
import { updateName } from "./updateName";

export const projectRouter = createTRPCRouter({
  create: createProject,
  delete: deleteProject,
  getProjects: getProjects,
  getProjectById,
  getFunctions,
  updateName,
});

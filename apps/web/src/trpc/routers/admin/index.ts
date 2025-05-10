import { createTRPCRouter } from "~/trpc/trpc";
import { getProject } from "./getProject";
import { getProjects } from "./getProjects";
import { updatePlan } from "./updatePlan";

export const adminRouter = createTRPCRouter({
  getProjects,
  getProject,
  updatePlan,
});

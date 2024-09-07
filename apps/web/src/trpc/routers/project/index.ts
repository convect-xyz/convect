import { createTRPCRouter } from "../../trpc";
import { createProject } from "./create";
import { deleteProject } from "./delete";
import { getActivePlan } from "./getActivePlan";
import { getCollaborators } from "./getCollaborators";
import { getFunctions } from "./getFunctions";
import { getPaymentMethods } from "./getPaymentMethods";
import { getPendingInvites } from "./getPendingInvites";
import { getProjectById } from "./getProjectById";
import { getProjects } from "./getProjects";
import { getStripeSetupIntent } from "./getStripeSetupIntent";
import { getUsage } from "./getUsage";
import { inviteCollaborator } from "./inviteCollaborator";
import { setDefaultPaymentMethod } from "./setDefaultPaymentMethod";
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
  getUsage,
  getPaymentMethods,
  getStripeSetupIntent,
  setDefaultPaymentMethod,
  getActivePlan,
});

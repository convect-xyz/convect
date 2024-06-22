import { createTRPCRouter } from "~/server/api/trpc";
import { createApiKey } from "./routers/apiKey/createApiKey";
import { getApiKeys } from "./routers/apiKey/getApiKeys";
import { switchPlan } from "./routers/billing/switchPlan";
import { getBranches } from "./routers/github/getBranches";
import { getInstallations } from "./routers/github/getInstallations";
import { getRepositories } from "./routers/github/getRepositories";
import { addEnv } from "./routers/handler/addEnv";
import { createFunction } from "./routers/handler/create";
import { deleteFunction } from "./routers/handler/delete";
import { deleteEnv } from "./routers/handler/deleteEnv";
import { getEnvs } from "./routers/handler/getEnvs";
import { getFunction } from "./routers/handler/getFunction";
import { getLogs } from "./routers/handler/getLogs";
import { getOverview } from "./routers/handler/getOverview";
import { getSettings } from "./routers/handler/getSettings";
import { getTransactions } from "./routers/handler/getTransactions";
import { updateDescription } from "./routers/handler/updateDescription";
import { updateEnv } from "./routers/handler/updateEnv";
import { updateName } from "./routers/handler/updateName";
import { createProducer } from "./routers/producers/create";
import { getProducers } from "./routers/producers/getProducers";
import { createProject } from "./routers/project/create";
import { getFunctions } from "./routers/project/getFunctions";
import { getProjectById } from "./routers/project/getProjectById";
import { getProjects } from "./routers/project/getProjects";

export const billingRouter = createTRPCRouter({
  switchPlan,
});

export const apiKeysRouter = createTRPCRouter({
  createApiKey,
  getApiKeys,
});

export const githubRouter = createTRPCRouter({
  getBranches,
  getInstallations: getInstallations,
  getRepositories: getRepositories,
});

export const functionRouter = createTRPCRouter({
  create: createFunction,
  get: getFunction,
  delete: deleteFunction,
  getLogs,
  getEnvs,
  addEnv,
  deleteEnv,
  updateEnv,
  getOverview,
  getTransactions,
  updateName,
  updateDescription,
  getSettings,
});

export const producersRouter = createTRPCRouter({
  create: createProducer,
  getProducers: getProducers,
});

export const projectRouter = createTRPCRouter({
  create: createProject,
  getProjects: getProjects,
  getProjectById,
  getFunctions,
});

export const appRouter = createTRPCRouter({
  project: projectRouter,
  producers: producersRouter,
  github: githubRouter,
  functions: functionRouter,
  apiKeys: apiKeysRouter,
  billing: billingRouter,
});

export type AppRouter = typeof appRouter;

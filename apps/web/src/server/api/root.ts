import { createTRPCRouter } from "~/server/api/trpc";
import { createApiKey } from "./routers/apiKey/createApiKey";
import { getApiKeys } from "./routers/apiKey/getApiKeys";
import { switchPlan } from "./routers/billing/switchPlan";
import { getBranches } from "./routers/github/getBranches";
import { getInstallations } from "./routers/github/getInstallations";
import { getRepositories } from "./routers/github/getRepositories";
import { addEnv } from "./routers/handler/addEnv";
import { createHandler } from "./routers/handler/create";
import { deleteHandler } from "./routers/handler/delete";
import { deleteEnv } from "./routers/handler/deleteEnv";
import { getEnvs } from "./routers/handler/getEnvs";
import { getHandler } from "./routers/handler/getHandler";
import { getHandlers } from "./routers/handler/getHandlers";
import { getLogs } from "./routers/handler/getLogs";
import { getOverview } from "./routers/handler/getOverview";
import { getTransactions } from "./routers/handler/getTransactions";
import { updateEnv } from "./routers/handler/updateEnv";
import { createProducer } from "./routers/producers/create";
import { getProducers } from "./routers/producers/getProducers";
import { createProject } from "./routers/project/create";
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

export const handlerRouter = createTRPCRouter({
  createHandler,
  getHandlers,
  deleteHandler,
  getHandler,
  getLogs,
  getEnvs,
  addEnv,
  deleteEnv,
  updateEnv,
  getOverview,
  getTransactions,
});

export const producersRouter = createTRPCRouter({
  create: createProducer,
  getProducers: getProducers,
});

export const projectRouter = createTRPCRouter({
  create: createProject,
  getProjects: getProjects,
  getProjectById,
});

export const appRouter = createTRPCRouter({
  project: projectRouter,
  producers: producersRouter,
  github: githubRouter,
  handlers: handlerRouter,
  apiKeys: apiKeysRouter,
  billing: billingRouter,
});

export type AppRouter = typeof appRouter;

import { createTRPCRouter } from "~/server/api/trpc";
import { createDeploymentApi } from "./routers/deployment/create";
import { getBranches } from "./routers/github/getBranches";
import { getInstallations } from "./routers/github/getInstallations";
import { getRepositories } from "./routers/github/getRepositories";
import { createProducer } from "./routers/producers/create";
import { createProject } from "./routers/project/create";
import { getProjectById } from "./routers/project/getProjectById";

export const githubRouter = createTRPCRouter({
  getBranches,
  getInstallations: getInstallations,
  getRepositories: getRepositories,
});

export const deploymentRouter = createTRPCRouter({
  createDeployment: createDeploymentApi,
});

export const producersRouter = createTRPCRouter({
  create: createProducer,
});

export const projectRouter = createTRPCRouter({
  create: createProject,
  getProjectById,
});

export const appRouter = createTRPCRouter({
  project: projectRouter,
  producers: producersRouter,
  github: githubRouter,
  deployments: deploymentRouter,
});

export type AppRouter = typeof appRouter;

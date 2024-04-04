import { createTRPCRouter } from "~/server/api/trpc";
import { createProducerApi } from "./routers/producers/create";
import { createProject } from "./routers/project/create";
import { getInstallations } from "./routers/project/getInstallations";
import { getRepositories } from "./routers/project/getRepositories";

export const producersRouter = createTRPCRouter({
  create: createProducerApi,
});

export const projectRouter = createTRPCRouter({
  create: createProject,
  getInstallations: getInstallations,
  getRepositories: getRepositories,
});

export const appRouter = createTRPCRouter({
  project: projectRouter,
  producers: producersRouter,
});

export type AppRouter = typeof appRouter;

import { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { createTRPCRouter } from "~/server/api/trpc";
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
import { updateEnv } from "./routers/handler/updateEnv";
import { createProducer } from "./routers/producers/create";
import { getProducers } from "./routers/producers/getProducers";
import { createProject } from "./routers/project/create";
import { getProjectById } from "./routers/project/getProjectById";
import { getProjects } from "./routers/project/getProjects";

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
});

type RouterInput = inferRouterInputs<typeof handlerRouter>;
type RouterOutput = inferRouterOutputs<typeof handlerRouter>;

export type GetHandlersOutput = RouterOutput["getHandlers"];

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
});

export type AppRouter = typeof appRouter;

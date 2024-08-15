import { createTRPCRouter } from "~/trpc/trpc";
import { accountsRouter } from "./routers/accounts";
import { createApiKey } from "./routers/apiKey/createApiKey";
import { deleteApiKey } from "./routers/apiKey/deleteApiKey";
import { getApiKeys } from "./routers/apiKey/getApiKeys";
import { switchPlan } from "./routers/billing/switchPlan";
import { addEnv } from "./routers/function/addEnv";
import { createFunction } from "./routers/function/create";
import { deleteFunction } from "./routers/function/delete";
import { deleteEnv } from "./routers/function/deleteEnv";
import { getDeployments } from "./routers/function/getDeployments";
import { getEnvs } from "./routers/function/getEnvs";
import { getFunction } from "./routers/function/getFunction";
import { getInvocations } from "./routers/function/getInvocations";
import { getLogs } from "./routers/function/getLogs";
import { getOverview } from "./routers/function/getOverview";
import { getTransactions } from "./routers/function/getTransactions";
import { updateDescription } from "./routers/function/updateDescription";
import { updateEnv } from "./routers/function/updateEnv";
import { updateName } from "./routers/function/updateName";
import { createProducer } from "./routers/producers/create";
import { getProducers } from "./routers/producers/getProducers";
import { projectRouter } from "./routers/project";

export const billingRouter = createTRPCRouter({
  switchPlan,
});

export const apiKeysRouter = createTRPCRouter({
  createApiKey,
  deleteApiKey,
  getApiKeys,
});

export const functionRouter = createTRPCRouter({
  create: createFunction,
  get: getFunction,
  delete: deleteFunction,
  getEnvs,
  addEnv,
  deleteEnv,
  updateEnv,
  updateName,
  updateDescription,
  getInvocations,
  getDeployments,
  getLogs,
  getOverview,
  getTransactions,
});

export const producersRouter = createTRPCRouter({
  create: createProducer,
  getProducers: getProducers,
});

export const appRouter = createTRPCRouter({
  accounts: accountsRouter,
  project: projectRouter,
  producers: producersRouter,
  functions: functionRouter,
  apiKeys: apiKeysRouter,
  billing: billingRouter,
});

export type AppRouter = typeof appRouter;

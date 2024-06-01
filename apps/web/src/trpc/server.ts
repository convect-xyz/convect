import "server-only";

import { headers } from "next/headers";

import { appRouter } from "~/server/api/root";
import { createCallerFactory, createTRPCContext } from "~/server/api/trpc";

const createCaller = createCallerFactory(appRouter);
export const caller = createCaller(async () => {
  return createTRPCContext({ headers: headers() });
});

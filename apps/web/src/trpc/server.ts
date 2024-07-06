import "server-only";

import { createServerSideHelpers } from "@trpc/react-query/server";
import { headers } from "next/headers";

import { cache } from "react";
import superjson from "superjson";
import { appRouter } from "~/trpc/router";
import { createCallerFactory, createTRPCContext } from "~/trpc/trpc";

const createCaller = createCallerFactory(appRouter);
export const caller = createCaller(async () => {
  return createTRPCContext({ headers: headers() });
});

export const getReactQueryHelper = cache(async () =>
  createServerSideHelpers({
    router: appRouter,
    ctx: await createTRPCContext({ headers: headers() }),
    transformer: superjson, // optional - adds superjson serialization
  }),
);

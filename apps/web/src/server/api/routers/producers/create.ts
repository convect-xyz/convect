import { v4 } from "uuid";
import { z } from "zod";
import { createProducer } from "~/server/actions/producer/createProducer";
import { protectedProcedure } from "~/server/api/trpc";

export const createProducerApi = protectedProcedure
  .input(
    z.object({
      wsUrl: z.string(),
      pollingUrl: z.string(),
    }),
  )
  .output(
    z.object({
      id: z.string(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const id = v4();

    await createProducer({
      id,
      wsUrl: input.wsUrl,
      pollingUrl: input.pollingUrl,
      ...ctx,
    });

    return {
      id,
    };
  });

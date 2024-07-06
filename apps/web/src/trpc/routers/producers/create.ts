import { v4 } from "uuid";
import { z } from "zod";
import { createProducer as _createProducer } from "~/server/actions/producer/createProducer";
import { protectedProcedure } from "~/trpc/trpc";

export const createProducer = protectedProcedure
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

    await _createProducer({
      id,
      wsUrl: input.wsUrl,
      pollingUrl: input.pollingUrl,
      ...ctx,
    });

    return {
      id,
    };
  });

import axios from "axios";
import { z } from "zod";
import { protectedProcedure } from "~/server/api/trpc";

export const getOverview = protectedProcedure
  .input(
    z.object({
      handlerId: z.number(),
    }),
  )
  .output(
    z.object({
      lastFetchedBlock: z.number(),
      transactionCount: z.number(),
    }),
  )
  .query(async (opts) => {
    const { input, ctx } = opts;

    const response = await axios.post(
      "https://gfxa802p84.execute-api.eu-west-1.amazonaws.com/dev/status",
      {
        handlerId: input.handlerId.toString(),
      },
    );

    return {
      transactionCount: response.data.transactionCount,
      lastFetchedBlock: response.data.lastBlock,
    };
  });

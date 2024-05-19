import { TRPCError } from "@trpc/server";
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
      processedTransactionsCount: z.number(),
    }),
  )
  .query(async (opts) => {
    const { input, ctx } = opts;

    const handler = await ctx.db.query.handler.findFirst({
      where(fields, { eq }) {
        return eq(fields.id, input.handlerId);
      },
    });

    if (!handler) {
      throw new TRPCError({ message: "Handler not found", code: "NOT_FOUND" });
    }
    console.log("here");
    try {
      const response = await axios.post(
        "https://gfxa802p84.execute-api.eu-west-1.amazonaws.com/dev/status",
        {
          handlerId: handler.internalId.toString(),
        },
      );

      console.log(response);

      return {
        transactionCount: response.data.transactionCount,
        processedTransactionsCount: response.data.processedTransactionsCount,
        lastFetchedBlock: response.data.lastBlock,
      };
    } catch (e) {
      console.log(e);
    }
    return {} as any;
  });

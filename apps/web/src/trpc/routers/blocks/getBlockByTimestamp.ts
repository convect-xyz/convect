import { EtherscanProvider } from "@convect-xyz/server";
import { z } from "zod";
import { db } from "~/server/db";
import { protectedProcedure } from "~/trpc/trpc";

export const getBlockByTimestamp = protectedProcedure
  .input(
    z.object({
      chainId: z.number(),
      timestampSecs: z.number(),
    }),
  )
  .output(
    z.object({
      blockNumber: z.number(),
    }),
  )
  .mutation(async ({ input }) => {
    const etherscanProvider = new EtherscanProvider(input.chainId, db);
    const blockNumber = await etherscanProvider.getBlockNumberByTime(
      input.timestampSecs,
    );
    return {
      blockNumber,
    };
  });

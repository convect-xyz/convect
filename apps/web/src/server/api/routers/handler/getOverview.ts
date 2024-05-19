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
      avgDuration: z.number(),
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

    try {
      const response = await axios.post(
        "https://gfxa802p84.execute-api.eu-west-1.amazonaws.com/dev/status",
        {
          handlerId: handler.internalId.toString(),
        },
      );

      const avgDuration = await axios
        .post(
          "https://api.eu-central-1.aws.tinybird.co/v0/sql",
          {
            q: `%
        SELECT AVG(duration_ms) FROM ingest_metrics_pipe WHERE handler_id = {{String(handler_id)}}`,
            handler_id: handler.internalId,
          },
          {
            headers: {
              Authorization:
                "Bearer REDACTED",
            },
          },
        )
        .then((r) => r.data)
        .catch((e) => {
          console.log(e.response.data);
          throw e;
        });

      return {
        transactionCount: response.data.transactionCount,
        processedTransactionsCount: response.data.processedTransactionsCount,
        lastFetchedBlock: response.data.lastBlock,
        avgDuration,
      };
    } catch (e) {
      console.log(e);
    }
    return {} as any;
  });

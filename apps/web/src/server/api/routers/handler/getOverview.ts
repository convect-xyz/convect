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
      recentTransactions: z.array(
        z.object({
          transactionHash: z.string(),
          labels: z.array(z.string()),
        }),
      ),
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

      const processedTransactions = await axios
        .post(
          "https://api.eu-central-1.aws.tinybird.co/v0/sql",
          {
            q: `%
        SELECT * FROM convect_transactions WHERE handler_id = {{String(handler_id)}} LIMIT 20 FORMAT JSON`,
            handler_id: handler.internalId,
          },
          {
            headers: {
              Authorization:
                "Bearer REDACTED",
            },
          },
        )
        .then((r) => {
          return z
            .array(
              z
                .object({
                  transaction_hash: z.string(),
                  labels: z
                    .string()
                    .transform((v) => z.array(z.string()).parse(JSON.parse(v))),
                })
                .transform((v) => ({
                  transactionHash: v.transaction_hash,
                  labels: v.labels,
                })),
            )
            .parse(r.data.data);
        })
        .catch((e) => {
          console.log(e.response.data);
          throw e;
        });

      return {
        transactionCount: response.data.transactionCount,
        processedTransactionsCount: response.data.processedTransactionsCount,
        lastFetchedBlock: response.data.lastBlock,
        avgDuration,
        recentTransactions: processedTransactions,
      };
    } catch (e) {
      console.log(e);
    }
    return {} as any;
  });

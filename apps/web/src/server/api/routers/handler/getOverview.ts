import { TRPCError } from "@trpc/server";
import axios from "axios";
import { Redis } from "ioredis";
import { z } from "zod";
import { protectedProcedure } from "~/server/api/trpc";

const redisClient = new Redis(
  6379,
  "rediss://default:REDACTED@stirred-jawfish-46999.upstash.io",
  {
    tls: {
      checkServerIdentity: (servername, cert) => {
        return undefined;
      },
    },
  },
);

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
      const response = await redisClient
        .call(`JSON.GET`, handler.internalId)
        .then((v) => JSON.parse(v as string));
      const [txCount, processedTxCount] = await redisClient.mget(
        `tx-count-${handler.internalId}`,
        `processed-tx-count-${handler.internalId}`,
      );

      const avgDuration = await axios
        .post(
          "https://api.eu-central-1.aws.tinybird.co/v0/sql",
          {
            q: `%
        SELECT AVG(duration_ms) FROM ingest_metrics WHERE handler_id = {{String(handler_id)}}`,
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
          console.log(e);
          throw e;
        });

      const successfulTx = await axios
        .post(
          "https://api.eu-central-1.aws.tinybird.co/v0/sql",
          {
            q: `%
        SELECT COUNT(DISTINCT(transaction_hash)) FROM convect_transactions WHERE handler_id = {{String(handler_id)}} AND status = 'SUCCESS'`,
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
          console.log(e);
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
                  labels: z.array(z.string()),
                })
                .transform((v) => ({
                  transactionHash: v.transaction_hash,
                  labels: v.labels,
                })),
            )
            .parse(r.data.data);
        })
        .catch((e) => {
          console.log(e);
          throw e;
        });

      console.log(avgDuration);
      return {
        transactionCount: Number(txCount),
        processedTransactionsCount: successfulTx,
        lastFetchedBlock: Number(response.LastBlock_),
        avgDuration: 0,
        recentTransactions: processedTransactions,
      };
    } catch (e) {
      console.log(e);
    }
    return {} as any;
  });

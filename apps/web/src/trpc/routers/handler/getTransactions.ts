import { analysisSchema } from "@convect-xyz/lib";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, ilike, max } from "drizzle-orm";
import { z } from "zod";
import { analysisDb } from "~/server/db/analysis";
import { protectedProcedure } from "~/trpc/trpc";

export const getTransactions = protectedProcedure
  .input(
    z.object({
      limit: z.number().min(1).max(25).default(25),
      cursor: z.number().nullish(),
      search: z.string().nullish(),
      status: z.enum(["FAILED", "SUCCESS"]).nullish(),
      handlerId: z.number(),
    }),
  )
  .output(
    z.object({
      transactions: z.array(
        z.object({
          id: z.number(),
          transactionHash: z.string(),
          status: z.enum(["SUCCESS", "FAILED"]),
          timestamp: z.number(),
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
      with: {
        producer: true,
      },
    });

    if (!handler) {
      throw new TRPCError({ message: "Handler not found", code: "NOT_FOUND" });
    }

    const currentDeployment = await ctx.db.query.deployment.findFirst({
      where(fields, { eq, and }) {
        return and(
          eq(fields.functionId, handler.functionId),
          eq(fields.status, "SUCCESS"),
        );
      },
      orderBy(fields, { desc }) {
        return desc(fields.createdAt);
      },
    });

    if (!currentDeployment) {
      throw new TRPCError({
        message: "Deployment not found",
        code: "NOT_FOUND",
      });
    }

    const getFilter = () => {
      let baseFilter = and(
        eq(
          analysisSchema.processedTransactions.handlerId,
          handler.functionId.toString(),
        ),
        eq(
          analysisSchema.processedTransactions.handlerVersion,
          handler.producer.chainId.toString(),
        ),
        eq(
          analysisSchema.processedTransactions.deploymentId,
          currentDeployment.id,
        ),
      );
      if (input.search) {
        baseFilter = and(
          baseFilter,
          ilike(
            analysisSchema.processedTransactions.transactionHash,
            `%${input.search}%`,
          ),
        )!;
      }
      if (input.status) {
        baseFilter = and(
          baseFilter,
          eq(analysisSchema.processedTransactions.status, input.status),
        )!;
      }
      return baseFilter;
    };

    const maxTimestamp = max(analysisSchema.processedTransactions.timestamp).as(
      "max_timestamp",
    );
    const distinctTransactions = analysisDb
      .select({
        transactionHash: analysisSchema.processedTransactions.transactionHash,
        maxTimestamp,
      })
      .from(analysisSchema.processedTransactions)
      .where(getFilter())
      .groupBy(analysisSchema.processedTransactions.transactionHash)
      .orderBy(desc(maxTimestamp))
      .limit(input.limit)
      .as("distinct_transactions");

    const recentTransactions = await analysisDb
      .select()
      .from(analysisSchema.processedTransactions)
      .innerJoin(
        distinctTransactions,
        and(
          eq(
            analysisSchema.processedTransactions.transactionHash,
            distinctTransactions.transactionHash,
          ),
          eq(
            analysisSchema.processedTransactions.timestamp,
            distinctTransactions.maxTimestamp,
          ),
        ),
      )
      .orderBy(desc(analysisSchema.processedTransactions.timestamp))
      .limit(input.limit);

    return {
      transactions: recentTransactions
        .flatMap((v) => v.processed_transactions)
        .map((tx) => ({
          id: tx.id,
          transactionHash: tx.transactionHash,
          status: tx.status as "SUCCESS" | "FAILED",
          timestamp: tx.timestamp.getTime(),
        })),
    };
  });

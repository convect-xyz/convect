import { analysisSchema } from "@convect-xyz/server";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, ilike } from "drizzle-orm";
import { z } from "zod";
import { analysisDb } from "~/server/db/analysis";
import { protectedProcedure } from "~/trpc/trpc";
import { throwIfNotProjectCollaborator } from "../permissions";

export const getTransactions = protectedProcedure
  .input(
    z.object({
      limit: z.number().min(1).max(25).default(25),
      cursor: z.number().nullish(),
      search: z.string().nullish(),
      status: z.enum(["FAILED", "SUCCESS"]).nullish(),
      functionId: z.number(),
      chainId: z.number(),
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

    const currentDeployment = await ctx.db.query.deployment.findFirst({
      where(fields, { eq, and }) {
        return and(
          eq(fields.functionId, input.functionId),
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

    const fn = await ctx.db.query.convectFunctions.findFirst({
      where(fields, { eq }) {
        return eq(fields.id, input.functionId);
      },
    });
    if (!fn) {
      throw new TRPCError({ message: "Handler not found", code: "NOT_FOUND" });
    }

    await throwIfNotProjectCollaborator({
      projectId: fn.projectId,
      userId: ctx.session.user.id,
    });

    const getFilter = () => {
      let baseFilter = and(
        eq(
          analysisSchema.processedTransactions.handlerId,
          input.functionId.toString(),
        ),
        eq(
          analysisSchema.processedTransactions.handlerVersion,
          input.chainId.toString(),
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
        );
      }
      if (input.status) {
        baseFilter = and(
          baseFilter,
          eq(analysisSchema.processedTransactions.status, input.status),
        );
      }
      return baseFilter;
    };

    const distinctTransactions = analysisDb
      .selectDistinctOn(
        [analysisSchema.processedTransactions.transactionHash],
        {
          id: analysisSchema.processedTransactions.id,
          status: analysisSchema.processedTransactions.status,
          transactionHash: analysisSchema.processedTransactions.transactionHash,
          timestamp: analysisSchema.processedTransactions.timestamp,
        },
      )
      .from(analysisSchema.processedTransactions)
      .where(getFilter())
      .orderBy(
        desc(analysisSchema.processedTransactions.timestamp),
        desc(analysisSchema.processedTransactions.transactionHash),
      )
      .limit(input.limit)
      .as("distinct_transactions");

    const recentTransactions = await analysisDb
      .select()
      .from(distinctTransactions)
      .orderBy(desc(distinctTransactions.timestamp));

    return {
      transactions: recentTransactions.map((tx) => ({
        id: tx.id,
        transactionHash: tx.transactionHash,
        status: tx.status as "SUCCESS" | "FAILED",
        timestamp: tx.timestamp.getTime(),
      })),
    };
  });

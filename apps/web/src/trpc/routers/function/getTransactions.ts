import { analysisSchema } from "@convect-xyz/server";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gte, ilike } from "drizzle-orm";
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
          id: z.string(),
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
        eq(analysisSchema.ethTransactions.deploymentId, currentDeployment.id),
        eq(
          analysisSchema.ethTransactions.functionId,
          input.functionId.toString(),
        ),
        eq(analysisSchema.ethTransactions.chainId, input.chainId),
      );
      if (input.search) {
        baseFilter = and(
          baseFilter,
          ilike(
            analysisSchema.ethTransactions.transactionHash,
            `%${input.search}%`,
          ),
        );
      }
      if (input.cursor) {
        baseFilter = and(
          baseFilter,
          gte(analysisSchema.ethTransactions.id, input.cursor),
        );
      }
      return baseFilter;
    };

    const recentTransactions = await analysisDb
      .select()
      .from(analysisSchema.ethTransactions)
      .where(getFilter())
      .orderBy(
        desc(analysisSchema.ethTransactions.createdAt),
        asc(analysisSchema.ethTransactions.id),
      )
      .limit(input.limit);

    return {
      transactions: recentTransactions.map((tx) => ({
        id: `${tx.transactionHash}-${tx.functionId}-${tx.deploymentId}`,
        transactionHash: tx.transactionHash,
        status: "SUCCESS",
        timestamp: tx.createdAt.getTime(),
      })),
    };
  });

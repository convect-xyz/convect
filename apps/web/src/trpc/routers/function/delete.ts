import { schema } from "@convect-xyz/lib";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { env } from "~/env";
import { destroyDeployment } from "~/server/actions/builds";
import { protectedProcedure } from "~/trpc/trpc";

export const deleteFunction = protectedProcedure
  .input(
    z.object({
      functionId: z.number(),
    }),
  )
  .output(z.object({}))
  .mutation(async ({ ctx, input }) => {
    const convectFunction = await ctx.db.query.convectFunctions.findFirst({
      where: (fields, { eq, and }) => and(eq(fields.id, input.functionId)),
      with: {
        project: true,
      },
    });

    if (!convectFunction) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Function not found" });
    }

    if (convectFunction.project.userId !== ctx.session.user.id) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Function not found" });
    }

    await destroyDeployment({
      version: env.VERSION,
      functionId: input.functionId,
      functionGlobalId: convectFunction.globalId,
    });

    await ctx.db
      .delete(schema.convectFunctions)
      .where(eq(schema.convectFunctions.id, input.functionId));

    return {};
  });

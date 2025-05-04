import { ConvectFunctionFacade } from "@convect-xyz/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { env } from "~/env";
import { ecs, s3 } from "~/lib/server/aws";
import { getStackOutputs } from "~/server/actions/pulumi/getStackOutputs";
import { db } from "~/server/db";
import { protectedProcedure } from "~/trpc/trpc";
import { throwIfNotProjectCollaborator } from "../permissions";

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

    await throwIfNotProjectCollaborator({
      projectId: convectFunction.projectId,
      userId: ctx.session.user.id,
    });

    const convectFn = new ConvectFunctionFacade(input.functionId, {
      s3,
      db,
      ecs,
    });

    const outputs = await getStackOutputs();
    await convectFn.destroy({
      taskDefinition: outputs.builderTaskDefinition,
      version: env.VERSION,
      databaseUrl: env.DATABASE_URL,
    });

    return {};
  });

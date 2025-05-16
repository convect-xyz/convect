import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { planService } from "~/lib/server/products/service";
import { protectedProcedure } from "~/trpc/trpc";
import { throwIfNotProjectCollaborator } from "../permissions";

export const cancelPlan = protectedProcedure
  .input(
    z.object({
      projectId: z.number(),
    }),
  )
  .output(z.object({}))
  .mutation(async ({ input, ctx }) => {
    const project = await ctx.db.query.projects.findFirst({
      where(fields, { eq }) {
        return eq(fields.id, input.projectId);
      },
    });
    if (!project) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    await throwIfNotProjectCollaborator({
      projectId: input.projectId,
      userId: ctx.session.user.id,
    });

    await planService.cancelSubscription(project);

    return {};
  });

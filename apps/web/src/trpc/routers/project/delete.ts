import { z } from "zod";
import { protectedProcedure } from "~/trpc/trpc";
import { throwIfNotProjectCollaborator } from "../permissions";

export const deleteProject = protectedProcedure
  .input(
    z.object({
      projectId: z.number(),
    }),
  )
  .output(z.object({}))
  .mutation(async ({ ctx, input }) => {
    await throwIfNotProjectCollaborator({
      projectId: input.projectId,
      userId: ctx.session.user.id,
    });

    return {};
  });

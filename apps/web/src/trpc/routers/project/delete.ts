import { z } from "zod";
import { protectedProcedure } from "~/trpc/trpc";

export const deleteProject = protectedProcedure
  .input(
    z.object({
      projectId: z.number(),
    }),
  )
  .output(z.object({}))
  .mutation(async ({ ctx, input }) => {
    return {};
  });

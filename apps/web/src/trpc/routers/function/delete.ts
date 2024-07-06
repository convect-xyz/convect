import { z } from "zod";
import { protectedProcedure } from "~/trpc/trpc";

export const deleteHandler = protectedProcedure
  .input(
    z.object({
      functionId: z.number(),
    }),
  )
  .output(z.object({}))
  .mutation(async ({ ctx, input }) => {
    return {};
  });

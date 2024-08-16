import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure } from "~/trpc/trpc";
import { getCollaborator } from "../permissions";

export const deleteProject = protectedProcedure
  .input(
    z.object({
      projectId: z.number(),
    }),
  )
  .output(z.object({}))
  .mutation(async ({ ctx, input }) => {
    const collaborator = await getCollaborator(
      input.projectId,
      ctx.session.user.id,
    );
    if (!collaborator) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
    }

    return {};
  });

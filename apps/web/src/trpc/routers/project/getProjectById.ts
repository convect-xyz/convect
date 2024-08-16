import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure } from "~/trpc/trpc";
import { getCollaborator } from "../permissions";

export const getProjectById = protectedProcedure
  .input(
    z.object({
      id: z.coerce.number(),
    }),
  )
  .output(
    z.object({
      id: z.number(),
      name: z.string(),
    }),
  )
  .query(async ({ ctx, input }) => {
    const collaborator = await getCollaborator(input.id, ctx.session.user.id);
    if (!collaborator) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
    }

    const project = await ctx.db.query.projects.findFirst({
      where(fields, { eq }) {
        return eq(fields.id, input.id);
      },
    });

    if (!project) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
    }

    return project;
  });

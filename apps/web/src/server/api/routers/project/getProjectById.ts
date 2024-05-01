import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure } from "~/server/api/trpc";

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
    const project = await ctx.db.query.projects.findFirst({
      where(fields, { eq, and }) {
        return and(
          eq(fields.id, input.id),
          eq(fields.userId, ctx.session.user.id),
        );
      },
    });

    if (!project) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
    }

    return project;
  });

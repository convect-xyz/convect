import { schema } from "@convect-xyz/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure } from "~/trpc/trpc";

export const getActivePlan = protectedProcedure
  .input(
    z.object({
      projectId: z.number(),
    }),
  )
  .output(
    z.object({
      name: z.enum(schema.planEnum.enumValues),
    }),
  )
  .query(async ({ input, ctx }) => {
    const project = await ctx.db.query.projects.findFirst({
      where(fields, { eq }) {
        return eq(fields.id, input.projectId);
      },
    });
    if (!project) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    return {
      name: project.planType,
    };
  });

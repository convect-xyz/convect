import { schema } from "@convect-xyz/lib";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure } from "~/trpc/trpc";

export const getActivePlan = protectedProcedure
  .input(z.object({}))
  .output(
    z.object({
      name: z.enum(schema.planEnum.enumValues),
    }),
  )
  .query(async ({ ctx }) => {
    const user = await ctx.db.query.users.findFirst({
      where(fields, { eq }) {
        return eq(fields.id, ctx.session.user.id);
      },
    });
    if (!user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    return {
      name: user.planType,
    };
  });

import { TRPCError } from "@trpc/server";
import { Stripe } from "stripe";
import { z } from "zod";
import { env } from "~/env";
import { planService } from "~/lib/server/products";
import { protectedProcedure } from "~/trpc/trpc";

const stripe = new Stripe(env.STRIPE_API_KEY);

export const switchPlan = protectedProcedure
  .input(
    z.object({
      newPlan: z.enum(["HOBBY", "PRO"]),
      projectId: z.number(),
    }),
  )
  .output(z.object({}))
  .mutation(async ({ ctx, input }) => {
    const project = await ctx.db.query.projects.findFirst({
      where(fields, { eq }) {
        return eq(fields.id, input.projectId);
      },
    });
    if (!project) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    await planService.switchPlan(project, input.newPlan);

    return {};
  });

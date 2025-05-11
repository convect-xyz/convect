import { schema } from "@convect-xyz/server";
import { TRPCError } from "@trpc/server";
import { InferSelectModel } from "drizzle-orm";
import { Stripe } from "stripe";
import { z } from "zod";
import { env } from "~/env";
import { planService, quotaService } from "~/lib/server/products";
import { currentMonthUsage } from "~/lib/server/products/usage";
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

    await ensureCompliance(project, input.newPlan);

    await planService.switchPlan(project, input.newPlan);

    return {};
  });

async function ensureCompliance(
  project: InferSelectModel<typeof schema.projects>,
  newPlan: "HOBBY" | "PRO",
) {
  if (newPlan === "HOBBY") {
    const convectFunctionsUsage = await currentMonthUsage
      .convectFunctions(project.id)
      .then((d) => d.usage);
    const allowedFunctions = await quotaService.byPlanType(
      "convectFunctions",
      "HOBBY",
    );
    if (convectFunctionsUsage > allowedFunctions) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `To downgrade to a HOBBY plan, you must have at-most ${allowedFunctions} functions.`,
      });
    }
  }
}

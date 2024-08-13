import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { manifestSchema, parseManifest } from "~/lib/shared/manifest";
import schema from "~/server/db/schema";
import { protectedProcedure } from "~/trpc/trpc";

export const getFunction = protectedProcedure
  .input(
    z.object({
      projectId: z.number(),
      functionId: z.number(),
    }),
  )
  .output(
    z.object({
      id: z.number(),
      name: z.string(),
      description: z.string(),
      isInitialised: z.boolean(),
      project: z.object({
        name: z.string(),
      }),
      chains: z.array(
        z.object({
          name: z.string(),
          chainId: z.number(),
        }),
      ),
      currentDeployment: z.object({
        manifest: manifestSchema,
      }),
    }),
  )
  .query(async (opts) => {
    const { input, ctx } = opts;

    const fn = await ctx.db
      .select()
      .from(schema.convectFunctions)
      .innerJoin(
        schema.projects,
        eq(schema.projects.id, schema.convectFunctions.projectId),
      )
      .where(
        and(
          eq(schema.projects.userId, ctx.session.user.id),
          eq(schema.projects.id, input.projectId),
          eq(schema.convectFunctions.id, input.functionId),
        ),
      )
      .then((fns) => fns.at(0));

    if (!fn) {
      throw new TRPCError({
        message: "This function does not exist",
        code: "NOT_FOUND",
      });
    }

    const currentDeployment = await ctx.db.query.deployment.findFirst({
      where(fields, { eq, and }) {
        return and(
          eq(fields.functionId, input.functionId),
          eq(fields.status, "SUCCESS"),
        );
      },
      orderBy(fields, { desc }) {
        return desc(fields.createdAt);
      },
    });

    if (!currentDeployment) {
      throw new TRPCError({
        message: "This function does not exist",
        code: "NOT_FOUND",
      });
    }

    const manifest = parseManifest(currentDeployment.manifest);

    const chains = manifest.chains.map((c: any) => ({
      name: c.name,
      chainId: c.chainId,
    }));

    return {
      ...fn.convectFunction,
      isInitialised: true,
      project: fn.project,
      chains,
      currentDeployment: {
        manifest,
      },
    };
  });

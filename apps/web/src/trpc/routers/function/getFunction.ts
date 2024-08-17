import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { manifestSchema, parseManifest } from "~/lib/shared/manifest";
import schema from "~/server/db/schema";
import { protectedProcedure } from "~/trpc/trpc";
import { throwIfNotProjectCollaborator } from "../permissions";

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
      chains: z
        .array(
          z.object({
            name: z.string(),
            chainId: z.number(),
          }),
        )
        .nullable(),
      currentDeployment: z
        .object({
          manifest: manifestSchema,
        })
        .nullable(),
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
          eq(schema.projects.id, input.projectId),
          eq(schema.convectFunctions.id, input.functionId),
        ),
      )
      .then((fns) => fns.pop());
    if (!fn) {
      throw new TRPCError({
        message: "This function does not exist",
        code: "NOT_FOUND",
      });
    }

    await throwIfNotProjectCollaborator({
      projectId: fn.convectFunction.projectId,
      userId: ctx.session.user.id,
    });

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

    const manifest = currentDeployment
      ? parseManifest(currentDeployment.manifest)
      : null;

    const chains =
      manifest?.chains.map((c: any) => ({
        name: c.name,
        chainId: c.chainId,
      })) ?? null;

    return {
      ...fn.convectFunction,
      isInitialised: true,
      project: fn.project,
      chains,
      currentDeployment: manifest
        ? {
            manifest,
          }
        : null,
    };
  });

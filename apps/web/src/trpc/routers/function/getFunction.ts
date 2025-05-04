import { parseManifest } from "@convect-xyz/lib";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
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
      status: z.enum(["PENDING", "RUNNING", "DESTROYING"]),
      project: z.object({
        name: z.string(),
      }),
      activeDeployments: z.array(
        z.object({
          id: z.string(),
          chains: z.array(
            z.object({
              name: z.string(),
              chainId: z.number(),
            }),
          ),
          status: z.enum(schema.deploymentStatus.enumValues),
          runningAt: z.number().nullish(),
          finishedAt: z.number().nullish(),
        }),
      ),
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

    const [activeDeployments, destroyDeployment] = await Promise.all([
      ctx.db.query.deployment.findMany({
        where(fields, { eq, or }) {
          return and(
            eq(fields.functionId, input.functionId),
            eq(fields.status, "SUCCESS"),
            or(eq(fields.mode, "init"), eq(fields.mode, "update")),
          );
        },
        limit: 3,
        orderBy(fields, { desc }) {
          return desc(fields.createdAt);
        },
      }),
      ctx.db.query.deployment.findFirst({
        where(fields, { eq }) {
          return and(
            eq(fields.functionId, input.functionId),
            eq(fields.mode, "destroy"),
          );
        },
      }),
    ]);

    return {
      ...fn.convectFunction,
      status:
        activeDeployments.length === 0
          ? "PENDING"
          : !!destroyDeployment
            ? "DESTROYING"
            : "RUNNING",
      project: fn.project,
      activeDeployments: activeDeployments.map((d) => {
        const manifest = parseManifest(d.manifest);

        return {
          ...d,
          runningAt: d.runningAt?.getTime() ?? null,
          finishedAt: d.finishedAt?.getTime() ?? null,
          chains: manifest.chains,
        };
      }),
    };
  });

import { manifestSchema } from "@convect-xyz/lib";
import {
  ConvectFunctionFacade,
  ManifestValidationService,
} from "@convect-xyz/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { env } from "~/env";
import { ecs, s3 } from "~/lib/server/aws";
import { getStackOutputs } from "~/server/actions/pulumi/getStackOutputs";
import { db } from "~/server/db";
import { protectedProcedure } from "~/trpc/trpc";
import { throwIfNotProjectCollaborator } from "../permissions";

export const confirmDeployment = protectedProcedure
  .input(
    z.object({
      deploymentId: z.string(),
      manifest: manifestSchema,
    }),
  )
  .output(z.object({}))
  .mutation(async ({ input, ctx }) => {
    const deployment = await db.query.deployment.findFirst({
      where: (fields, { eq, and }) => {
        let baseFilter = and(eq(fields.id, input.deploymentId));
        return baseFilter;
      },
      orderBy(fields, { desc }) {
        return [desc(fields.createdAt), desc(fields.id)];
      },
    });
    if (!deployment) {
      throw new TRPCError({
        message: "Deployment not found",
        code: "NOT_FOUND",
      });
    }
    if (deployment.approvedAt) {
      throw new TRPCError({
        message: "Deployment already approved",
        code: "BAD_REQUEST",
      });
    }

    const convectFn = await ctx.db.query.convectFunctions.findFirst({
      where(fields, { eq }) {
        return eq(fields.id, deployment.functionId);
      },
    });
    if (!convectFn) {
      throw new TRPCError({ message: "Handler not found", code: "NOT_FOUND" });
    }

    await throwIfNotProjectCollaborator({
      projectId: convectFn.projectId,
      userId: ctx.session.user.id,
    });

    const validator = new ManifestValidationService(db);

    try {
      await validator.validate(input.manifest);
    } catch (e) {
      throw new TRPCError({ message: "Invalid Manifest", code: "BAD_REQUEST" });
    }

    const fnFacade = new ConvectFunctionFacade(convectFn.id, {
      s3,
      db,
      ecs,
    });

    console.log("writing code and manifest");
    await fnFacade.writeManifest(input.manifest, input.deploymentId);
    console.log("code and manifest written");

    const stackOutputs = await getStackOutputs();
    console.log("stack outputs", stackOutputs);
    await fnFacade.confirmDeployment({
      deploymentId: input.deploymentId,
      manifest: input.manifest,
      builderTaskDefinition: stackOutputs.builderTaskDefinition,
      dbUrl: env.DATABASE_URL,
      encryptionKey: env.ENCRYPTION_KEY,
      reportingDbUrl: env.REPORTING_DATABASE_URL,
      redisUrl:
        "rediss://default:REDACTED@db-redis-nyc3-60846-do-user-17204040-0.e.db.ondigitalocean.com:25061",
    });
    console.log("deployment confirmed");

    return {};
  });

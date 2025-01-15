import { parseManifest } from "@convect-xyz/lib";
import {
  AppError,
  ConvectFunctionFacade,
  ManifestValidationService,
} from "@convect-xyz/server";
import { NextRequest, NextResponse } from "next/server";
import { v4 } from "uuid";
import { z } from "zod";
import { env } from "~/env";
import { ecs, s3 } from "~/lib/server/aws";
import { monikerRegex } from "~/lib/shared/validation";
import { getStackOutputs } from "~/server/actions/pulumi/getStackOutputs";
import { db } from "~/server/db";
import { getConvectFn, getFormData, getUserContext } from "../utils";

const zodId = z
  .string()
  .transform((v) => v.split("/"))
  .pipe(
    z.tuple([z.string().regex(monikerRegex), z.string().regex(monikerRegex)]),
  )
  .transform(([project, convectFn]) => ({ project, convectFn }));

const requestSchema = z.object({
  mode: z.literal("init"),
  id: zodId,
  handler: z.instanceof(Blob),
  manifest: z.instanceof(Blob),
  override: z.coerce.boolean(),
});

export const POST = async (req: NextRequest) => {
  const { user, error: userError } = await getUserContext(req);
  if (userError) {
    return NextResponse.json({ message: userError.message }, { status: 401 });
  }

  const { data, error: dataError } = await getFormData(req, requestSchema);
  if (dataError) {
    return NextResponse.json({ message: dataError.message }, { status: 401 });
  }

  const fn = await getConvectFn({
    convectFn: data.id.convectFn,
    project: data.id.project,
    userId: user.id,
  });
  if (!fn) {
    return NextResponse.json(
      { message: `Could not find function.` },
      { status: 401 },
    );
  }

  const manifest = parseManifest(await data.manifest.text());
  console.log(manifest);

  const validator = new ManifestValidationService(db);

  try {
    await validator.validate(manifest);
    console.log("manifest validated");
  } catch (e) {
    if (e instanceof AppError) {
      return NextResponse.json({ message: e.message }, { status: 400 });
    }

    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 },
    );
  }

  const convectFn = new ConvectFunctionFacade(fn.convectFunction.id, {
    s3,
    db,
    ecs,
  });

  const deploymentId = v4();

  console.log("writing code and manifest");
  await Promise.all([
    convectFn.writeCode({
      deploymentId,
      bundledCode: await data.handler.text(),
    }),
    convectFn.writeManifest(manifest, deploymentId),
  ]);
  console.log("code and manifest written");

  const stackOutputs = await getStackOutputs();
  console.log("stack outputs", stackOutputs);
  await convectFn.createDeployment({
    deploymentId,
    version: fn.convectFunction.infraVersion!,
    manifest: manifest,
    mode: data.mode,
    builderTaskDefinition: stackOutputs.builderTaskDefinition,
    dbUrl: env.DATABASE_URL,
    encryptionKey: env.ENCRYPTION_KEY,
    reportingDbUrl: env.REPORTING_DATABASE_URL,
    redisUrl:
      "rediss://default:REDACTED@db-redis-nyc3-60846-do-user-17204040-0.e.db.ondigitalocean.com:25061",
  });
  console.log("deployment created");

  return NextResponse.json({});
};

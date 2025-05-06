import { parseManifest } from "@convect-xyz/lib";
import {
  AppError,
  ConvectFunctionFacade,
  ManifestValidationService,
} from "@convect-xyz/server";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { v4 } from "uuid";
import { z } from "zod";
import { ecs, s3 } from "~/lib/server/aws";
import { monikerRegex } from "~/lib/shared/validation";
import { db } from "~/server/db";
import { getConvectFn, getFormData, getUserContext } from "../utils";

export const maxDuration = 300;

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
  const validator = new ManifestValidationService(db);

  try {
    await validator.validate(manifest);
  } catch (e) {
    if (e instanceof AppError) {
      return NextResponse.json({ message: e.message }, { status: 400 });
    }

    console.log(e);
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

  console.log("writing code");
  await convectFn.writeCode({
    deploymentId,
    bundledCode: await data.handler.text(),
  });
  console.log("code written");

  await convectFn.createDeployment({
    deploymentId,
    version: fn.convectFunction.infraVersion!,
    manifest: manifest,
    mode: data.mode,
  });

  const projectId = fn.project.id;
  const functionId = fn.convectFunction.id;
  return NextResponse.json({
    deploymentUrl:
      (req.headers.get("x-forwarded-proto") ? "https://" : "http://") +
      headers().get("host") +
      `/projects/${projectId}/${functionId}/deployments/${deploymentId}`,
  });
};

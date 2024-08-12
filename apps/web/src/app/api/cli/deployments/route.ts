import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { v4 } from "uuid";
import { z } from "zod";
import { s3 } from "~/lib/server/aws";
import { decryptEnvValue } from "~/lib/server/security";
import { monikerRegex } from "~/lib/shared/validation";
import { createDeployment } from "~/server/actions/builds";
import { db } from "~/server/db";
import { getStripeCustomerId } from "~/trpc/routers/billing/switchPlan";
import { getConvectFn, getFormData, getUserContext } from "../utils";

const MANIFEST_BUCKET = "ingest-fetch-logs";

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
  }).then((v) => v.at(0));

  if (!fn) {
    return NextResponse.json(
      { message: `Could not find function.` },
      { status: 401 },
    );
  }

  const deploymentId = v4();

  const bundledHandler = data.handler;
  const sourcePrefix = `code/${fn.convectFunction.id}/${deploymentId}.zip`;
  const promises: Promise<any>[] = [
    s3.putObject({
      Bucket: "ingest-build-outputs",
      Key: sourcePrefix,
      Body: await bundledHandler.text(),
    }),
  ];

  const manifestPrefix = path.join(
    "manifests",
    fn.convectFunction.id.toString(),
    deploymentId + ".json",
  );
  const manifest = data.manifest;
  const rawManifest = await manifest.text();
  promises.push(
    s3.putObject({
      Bucket: MANIFEST_BUCKET,
      Key: manifestPrefix,
      Body: rawManifest,
    }),
  );

  await Promise.all(promises);

  const envs = await db.query.functionEnv.findMany({
    where(fields, { eq }) {
      return eq(fields.functionId, fn.convectFunction.id);
    },
  });

  const producers = await db.query.producers.findMany({
    where(fields, { inArray }) {
      return inArray(
        fields.chainId,
        JSON.parse(rawManifest).chains.map((chain: any) => chain.chainId),
      );
    },
  });

  await createDeployment({
    version: fn.convectFunction.infraVersion!,
    sourcePrefix,
    manifestBucket: MANIFEST_BUCKET,
    manifestPrefix,
    rawManifest,
    deploymentId,
    stripeCustomerId: await getStripeCustomerId(user),
    userId: user.id,
    functionId: fn.convectFunction.id,
    mode: data.mode,
    envs: envs.map((env) => ({
      ...env,
      value: decryptEnvValue(env.value, env.iv),
    })),
    chainConfigs: producers.map((p) => ({
      chainId: p.chainId,
      pollingUrl: p.pollingUrl,
      etherscanApiKey: p.etherscanApiKey,
      etherscanLike: p.etherscanLike,
    })),
  });

  return NextResponse.json({});
};

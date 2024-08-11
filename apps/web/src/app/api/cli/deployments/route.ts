import { schema } from "@convect-xyz/lib";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { v4 } from "uuid";
import { z } from "zod";
import { env } from "~/env";
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

const requestSchema = z
  .object({
    mode: z.literal("init"),
    id: zodId,
    handler: z.instanceof(Blob),
    manifest: z.instanceof(Blob),
    override: z.coerce.boolean(),
    producerId: z.coerce.number(),
  })
  .or(
    z.object({
      mode: z.literal("update"),
      id: zodId,
      handler: z.instanceof(Blob),
      producerId: z.coerce.number(),
    }),
  );

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

  const exists = await db.query.handler
    .findFirst({
      where(fields, { eq, and }) {
        return and(
          eq(fields.producerId, data.producerId),
          eq(fields.functionId, fn.convectFunction.id),
        );
      },
    })
    .then((v) => !!v);

  if (!exists) {
    await db
      .insert(schema.handler)
      .values({
        functionId: fn.convectFunction.id,
        infraVersion: env.VERSION,
        producerId: data.producerId,
      })
      .returning()
      .then((v) => v[0]);
  }

  const handler = await db.query.handler.findFirst({
    where(fields, { eq, and }) {
      return and(
        eq(fields.producerId, data.producerId),
        eq(fields.functionId, fn.convectFunction.id),
      );
    },
    with: {
      producer: true,
      convectFunction: {
        with: {
          envs: true,
        },
      },
    },
  });

  if (!handler) {
    return NextResponse.json(
      {
        message: "Handler not found",
      },
      {
        status: 400,
      },
    );
  }

  const deploymentId = v4();

  const bundledHandler = data.handler;
  const sourcePrefix = `code/${handler.convectFunction.id}/${deploymentId}.zip`;
  const promises: Promise<any>[] = [
    s3.putObject({
      Bucket: "ingest-build-outputs",
      Key: sourcePrefix,
      Body: await bundledHandler.text(),
    }),
  ];

  const manifestPrefix = path.join(
    "manifests",
    handler.convectFunction.id.toString(),
    deploymentId + ".json",
  );
  if (data.mode === "init") {
    const manifest = data.manifest;

    promises.push(
      s3.putObject({
        Bucket: MANIFEST_BUCKET,
        Key: manifestPrefix,
        Body: await manifest.text(),
      }),
    );
  }

  await Promise.all(promises);

  const allHandlers = await db.query.handler.findMany({
    where(fields, { eq }) {
      return eq(fields.functionId, handler.functionId);
    },
    with: {
      producer: true,
    },
  });

  await createDeployment({
    version: handler.infraVersion,
    sourcePrefix,
    manifestBucket: MANIFEST_BUCKET,
    manifestPrefix,
    deploymentId,
    stripeCustomerId: await getStripeCustomerId(user),
    userId: user.id,
    functionId: handler.functionId,
    mode: data.mode,
    envs: handler.convectFunction.envs.map((env) => ({
      ...env,
      value: decryptEnvValue(env.value, env.iv),
    })),
    chainConfigs: allHandlers.map((chainConfig) => ({
      chainId: chainConfig.producer.chainId,
      pollingUrl: chainConfig.producer.pollingUrl,
    })),
    etherscanApiKey: handler.producer.etherscanApiKey,
    etherscanLike: handler.producer.etherscanLike,
  });

  return NextResponse.json({});
};

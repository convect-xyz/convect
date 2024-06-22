import { schema } from "@convect-xyz/lib";
import { eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { v4 } from "uuid";
import { z } from "zod";
import { s3 } from "~/lib/server/aws";
import { decryptEnvValue } from "~/lib/server/security";
import { createDeployment } from "~/server/actions/builds";
import { getStripeCustomerId } from "~/server/api/routers/billing/switchPlan";
import { db } from "~/server/db";
import { getFormData, getUserContext } from "../utils";

const MANIFEST_BUCKET = "ingest-fetch-logs";

const requestSchema = z
  .object({
    mode: z.literal("init"),
    id: z.string(),
    handler: z.instanceof(Blob),
    manifest: z.instanceof(Blob),
    override: z.coerce.boolean(),
  })
  .or(
    z.object({
      mode: z.literal("update"),
      id: z.string(),
      handler: z.instanceof(Blob),
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

  const handler = await db.query.handler.findFirst({
    where(fields, { eq, and }) {
      return and(eq(fields.internalId, data.id));
    },
    with: {
      project: true,
      producer: true,
      envs: true,
    },
  });

  if (!handler || handler.project.userId !== user.id) {
    return NextResponse.json(
      { message: `Could not find handler.` },
      { status: 401 },
    );
  }

  const deploymentId = v4();

  if (data.mode === "init") {
    if (!data.override) {
      return NextResponse.json(
        { message: "Override denied." },
        { status: 401 },
      );
    }

    handler.version = await db
      .update(schema.handler)
      .set({
        version: sql`${schema.handler.version} + 1`,
      })
      .where(eq(schema.handler.id, handler.id))
      .returning({ version: schema.handler.version })
      .then((v) => v[0]!.version);
  }

  const bundledHandler = data.handler;
  const sourcePrefix = `code/${handler.internalId}/${handler.version}/${deploymentId}.zip`;
  const promises: Promise<any>[] = [
    s3.putObject({
      Bucket: "ingest-build-outputs",
      Key: sourcePrefix,
      Body: await bundledHandler.text(),
    }),
  ];

  const manifestPrefix = path.join(
    "manifests",
    handler.internalId,
    handler.version + ".json",
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

  await createDeployment({
    version: handler.infraVersion,
    sourcePrefix,
    manifestBucket: MANIFEST_BUCKET,
    manifestPrefix,
    deploymentId,
    stripeCustomerId: await getStripeCustomerId(user),
    userId: user.id,
    internalHandlerId: handler.internalId,
    internalHandlerVersion: handler.version,
    pollingUrl: handler.producer.pollingUrl,
    chainSns: handler.producer.topicArn!,
    chainId: handler.producer.chainId,
    mode: data.mode,
    envs: handler.envs.map((env) => ({
      ...env,
      value: decryptEnvValue(env.value, env.iv),
    })),
  });

  return NextResponse.json({});
};

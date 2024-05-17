import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { v4 } from "uuid";
import { z } from "zod";
import { env } from "~/env";
import { s3 } from "~/lib/server/aws";
import { decryptEnvValue } from "~/lib/server/security";
import { createDeployment } from "~/server/actions/builds";
import { db } from "~/server/db";

const MANIFEST_BUCKET = "ingest-fetch-logs";

const schema = z.object({
  mode: z.enum(["new", "update"]),
  identifier: z.string(),
  handler: z.instanceof(Blob),
  manifest: z.instanceof(Blob),
});
export const POST = async (req: NextRequest) => {
  const formData = await req
    .formData()
    .then((formData) => Object.fromEntries(formData.entries()))
    .then((data) => schema.parse(data));

  const [projectName, handlerName] = formData.identifier.split("/");

  if (!projectName || !handlerName) {
    return NextResponse.json(
      {},
      {
        status: 401,
      },
    );
  }

  const handler = await db.query.handler.findFirst({
    where(fields, { eq }) {
      return eq(fields.name, handlerName);
    },
    with: {
      project: true,
      producer: true,
      envs: true,
    },
  });

  if (!handler || handler.project.name !== projectName) {
    return NextResponse.json(
      {},
      {
        status: 401,
      },
    );
  }

  const bundledHandler = formData.handler;
  const manifest = formData.manifest;

  const response = await Promise.all([
    s3.putObject({
      Bucket: "ingest-build-outputs",
      Key: `code/${handler.internalId}.zip`,
      Body: await bundledHandler.text(),
    }),
    s3.putObject({
      Bucket: MANIFEST_BUCKET,
      Key: path.join("manifests", handler.internalId + ".json"),
      Body: await manifest.text(),
    }),
  ]);

  await createDeployment({
    version: env.VERSION,
    deploymentId: v4(),
    internalHandlerId: handler.internalId,
    pollingUrl: handler.producer.pollingUrl,
    chainSns: handler.producer.topicArn!,
    mode: formData.mode,
    envs: handler.envs.map((env) => ({
      ...env,
      value: decryptEnvValue(env.value, env.iv),
    })),
  });

  return NextResponse.json({});
};

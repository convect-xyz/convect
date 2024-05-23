import { schema } from "@kayakthedev/lib";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { v4 } from "uuid";
import { z } from "zod";
import { env } from "~/env";
import { s3 } from "~/lib/server/aws";
import { decryptEnvValue } from "~/lib/server/security";
import { createDeployment } from "~/server/actions/builds";
import { cleanup } from "~/server/api/routers/handler/delete";
import { db } from "~/server/db";

const MANIFEST_BUCKET = "ingest-fetch-logs";

const requestSchema = z.object({
  mode: z.enum(["init", "update"]),
  project: z.string(),
  handlerName: z.string(),
  handler: z.instanceof(Blob),
  manifest: z.instanceof(Blob),
  node: z.coerce.number(),
  override: z.coerce.boolean(),
});

export const POST = async (req: NextRequest) => {
  const parseResult = await req.formData().then(parseFormData);
  if (parseResult.error) {
    return NextResponse.json(
      {
        message: `Erorr parsing data: ${parseResult.error.message}`,
      },
      {
        status: 401,
      },
    );
  }

  const parsedData = parseResult.data;

  const project = await db.query.projects.findFirst({
    where(fields, { eq }) {
      return eq(fields.name, parsedData.project);
    },
  });

  if (!project) {
    return NextResponse.json(
      {
        message: `Could not find project (${parsedData.project}).`,
      },
      {
        status: 401,
      },
    );
  }

  const deploymentId = v4();

  const existingHandler = await db.query.handler.findFirst({
    where(fields, { eq }) {
      return and(
        eq(fields.name, parsedData.handlerName),
        eq(fields.projectId, project.id),
      );
    },
  });

  if (existingHandler) {
    await cleanup(existingHandler);

    await db
      .update(schema.handler)
      .set({
        internalId: v4(),
      })
      .where(eq(schema.handler.id, existingHandler.id));
  } else {
    await db
      .insert(schema.handler)
      .values({
        name: parsedData.handlerName,
        projectId: project.id,
        producerId: 1,
      })
      .returning()
      .then((v) => v[0]);
  }

  const handler = await db.query.handler
    .findFirst({
      where(fields, { eq }) {
        return and(
          eq(fields.name, parsedData.handlerName),
          eq(fields.projectId, project.id),
        );
      },
      with: {
        project: true,
        producer: true,
        envs: true,
      },
    })
    .then((v) => v!);

  const bundledHandler = parsedData.handler;
  const manifest = parsedData.manifest;

  const sourcePrefix = `code/${handler.internalId}/${deploymentId}.zip`;
  await Promise.all([
    s3.putObject({
      Bucket: "ingest-build-outputs",
      Key: sourcePrefix,
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
    sourcePrefix,
    deploymentId,
    internalHandlerId: handler.internalId,
    pollingUrl: handler.producer.pollingUrl,
    chainSns: handler.producer.topicArn!,
    mode: parsedData.mode,
    envs: handler.envs.map((env) => ({
      ...env,
      value: decryptEnvValue(env.value, env.iv),
    })),
  });

  return NextResponse.json({});
};

function parseFormData(formData: FormData) {
  try {
    return {
      data: requestSchema.parse(Object.fromEntries(formData.entries())),
      error: undefined,
    };
  } catch (e: any) {
    return { data: undefined, error: e as Error };
  }
}

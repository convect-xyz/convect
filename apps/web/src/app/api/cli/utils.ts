import { schema } from "@convect-xyz/lib";
import { and, eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "~/server/db";

export function getUrlParams<T extends z.Schema>(req: NextRequest, schema: T) {
  const data = Object.fromEntries(req.nextUrl.searchParams.entries());

  try {
    return {
      data: schema.parse(data) as z.infer<T>,
      error: undefined,
    };
  } catch (e: any) {
    return { data: undefined, error: e as Error };
  }
}

export async function getFormData<T extends z.Schema>(
  req: NextRequest,
  schema: T,
) {
  const data = await req.formData();
  try {
    return {
      data: schema.parse(Object.fromEntries(data.entries())) as z.infer<T>,
      error: undefined,
    };
  } catch (e: any) {
    return { data: undefined, error: e as Error };
  }
}

export async function getJsonData<T extends z.Schema>(
  req: NextRequest,
  schema: T,
) {
  const data = await req.json();
  try {
    return {
      data: schema.parse(data) as z.infer<T>,
      error: undefined,
    };
  } catch (e: any) {
    return { data: undefined, error: e as Error };
  }
}

export async function getUserContext(req: NextRequest) {
  const authorization = req.headers.get("Authorization");
  if (!authorization) {
    return {
      user: undefined,
      error: new Error("Authorization header is missing."),
    };
  }

  const [_, token] = authorization.split(" ");
  if (!token) {
    return { user: undefined, error: new Error("Token is missing.") };
  }

  const apiKey = await db.query.apiKey.findFirst({
    where(fields, { eq }) {
      return eq(fields.token, token);
    },
    with: {
      user: true,
    },
  });

  if (!apiKey) {
    return { user: undefined, error: new Error("Invalid API Key.") };
  }

  return { user: apiKey.user, error: undefined };
}

export async function getConvectFn({
  convectFn,
  project,
  userId,
}: {
  convectFn: string;
  project: string;
  userId: string;
}) {
  return db
    .select()
    .from(schema.convectFunctions)
    .innerJoin(
      schema.projects,
      eq(schema.convectFunctions.projectId, schema.projects.id),
    )
    .where(
      and(
        eq(schema.convectFunctions.name, convectFn),
        eq(schema.projects.name, project),
        eq(schema.projects.userId, userId),
      ),
    );
}

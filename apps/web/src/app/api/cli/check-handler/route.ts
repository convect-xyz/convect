import { and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "~/server/db";
import { getFormData, getUserContext } from "../utils";

const requestSchema = z
  .object({
    project: z.string(),
    handlerName: z.string(),
  })
  .or(
    z.object({
      available: z.boolean(),
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

  const project = await db.query.projects.findFirst({
    where(fields, { eq, and }) {
      return and(eq(fields.name, data.project), eq(fields.userId, user.id));
    },
  });

  if (!project) {
    return NextResponse.json({ exists: false });
  }

  const existingHandler = await db.query.handler.findFirst({
    where(fields, { eq }) {
      return and(
        eq(fields.name, data.handlerName),
        eq(fields.projectId, project.id),
      );
    },
  });

  return NextResponse.json({
    exists: !!existingHandler,
  });
};

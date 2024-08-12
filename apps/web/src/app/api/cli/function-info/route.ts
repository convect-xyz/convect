import { schema } from "@convect-xyz/lib";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { monikerRegex } from "~/lib/shared/validation";
import { db } from "~/server/db";
import { getUrlParams, getUserContext } from "../utils";

const reqSchema = z.object({
  id: z
    .string()
    .transform((v) => v.split("/"))
    .pipe(
      z.tuple([z.string().regex(monikerRegex), z.string().regex(monikerRegex)]),
    )
    .transform(([project, convectFn]) => ({ project, convectFn })),
});

export const GET = async (req: NextRequest) => {
  const { user, error: userError } = await getUserContext(req);
  if (userError) {
    return NextResponse.json({ message: userError.message }, { status: 401 });
  }

  const { data: searchParams, error: paramsError } = getUrlParams(
    req,
    reqSchema,
  );
  if (paramsError) {
    return NextResponse.json({ message: paramsError.message }, { status: 401 });
  }

  const results = await db
    .select()
    .from(schema.convectFunctions)
    .innerJoin(
      schema.projects,
      eq(schema.convectFunctions.projectId, schema.projects.id),
    )
    .where(
      and(
        eq(schema.convectFunctions.name, searchParams.id.convectFn),
        eq(schema.projects.name, searchParams.id.project),
        eq(schema.projects.userId, user.id),
      ),
    );

  if (results.length === 0) {
    return NextResponse.json(
      { message: "Convect Function not found" },
      { status: 404 },
    );
  }

  const convectFn = results.at(0)!.convectFunction;
  const project = results.at(0)!.project;

  const handlers = await db.query.handler.findMany({
    where(fields, { eq, and }) {
      return and(eq(fields.functionId, convectFn.id));
    },
    with: {
      producer: true,
    },
  });

  return NextResponse.json({
    functionName: convectFn.name,
    projectName: project.name,
    chains: handlers.map((h) => ({
      id: h.id,
      producer: {
        id: h.producer.id,
        chainId: h.producer.chainId,
        name: h.producer.name,
      },
    })),
  });
};

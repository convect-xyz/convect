import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "~/server/db";
import { getUrlParams, getUserContext } from "../utils";

const schema = z.object({
  id: z.string(),
});

export const GET = async (req: NextRequest) => {
  const { user, error: userError } = await getUserContext(req);
  if (userError) {
    return NextResponse.json({ message: userError.message }, { status: 401 });
  }

  const { data: searchParams, error: paramsError } = getUrlParams(req, schema);
  if (paramsError) {
    return NextResponse.json({ message: paramsError.message }, { status: 401 });
  }

  const handler = await db.query.handler.findFirst({
    where(fields, { eq }) {
      return eq(fields.internalId, searchParams.id);
    },
    with: {
      project: true,
      producer: true,
    },
  });

  if (!handler || handler.project.userId !== user.id) {
    return NextResponse.json({ message: "Handler not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: handler.internalId,
    handlerName: handler.name,
    projectName: handler.project.name,
    handlerVersion: handler.version,
    chainId: handler.producer.chainId,
  });
};

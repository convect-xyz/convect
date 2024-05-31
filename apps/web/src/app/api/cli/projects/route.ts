import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { getUserContext } from "../utils";

export const GET = async (req: NextRequest) => {
  const { user, error: userError } = await getUserContext(req);
  if (userError) {
    return NextResponse.json({ message: userError.message }, { status: 401 });
  }

  const projects = await db.query.projects.findMany({
    where(fields, { eq }) {
      return eq(fields.userId, user.id);
    },
  });

  return NextResponse.json({
    projects: projects.map((p) => p.name),
  });
};

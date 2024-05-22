import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";

export const GET = async (req: NextRequest) => {
  const projects = await db.query.projects.findMany({});

  return NextResponse.json({
    projects: projects.map((p) => p.name),
  });
};

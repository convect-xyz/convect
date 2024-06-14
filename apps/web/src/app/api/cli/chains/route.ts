import { isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { getUserContext } from "../utils";

export const GET = async (req: NextRequest) => {
  const { error: userError } = await getUserContext(req);
  if (userError) {
    return NextResponse.json({ message: userError.message }, { status: 401 });
  }

  const chains = await db.query.producers.findMany({
    where(fields, { eq }) {
      return isNull(fields.userId);
    },
  });

  return NextResponse.json({
    chains: chains.map((chain) => ({
      id: chain.id,
      name: chain.name,
      chainId: chain.chainId,
    })),
  });
};

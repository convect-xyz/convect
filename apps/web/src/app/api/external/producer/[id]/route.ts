import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";

export const GET = async (
  req: NextRequest,
  { params }: { params: { id: string } },
) => {
  console.log(params);
  if (params.id === "polygon") {
    return NextResponse.json({
      pollingUrl:
        "https://eth-mainnet.g.alchemy.com/v2/REDACTED",
    });
  }

  if (params.id === "mainnet") {
    return NextResponse.json({
      pollingUrl:
        "https://eth-mainnet.g.alchemy.com/v2/REDACTED",
    });
  }

  if (params.id === "blast") {
    return NextResponse.json({
      pollingUrl: "https://rpc.blast.io",
    });
  }

  const producer = await db.query.producers.findFirst({
    where(fields, { eq }) {
      return eq(fields.altId, params.id);
    },
  });

  if (!producer) {
    return NextResponse.json(
      {
        message: "Producer not found",
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    pollingUrl: producer?.altId,
  });
};

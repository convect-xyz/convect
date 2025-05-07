import { isNull, or } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "~/server/db";
import { chains } from "@infra/config/chains";
import { getJsonData, getUserContext } from "../utils";

const requestSchema = z.object({
  ids: z.array(z.string()),
});

export const POST = async (req: NextRequest) => {
  const { error: userError } = await getUserContext(req);
  if (userError) {
    return NextResponse.json({ message: userError.message }, { status: 401 });
  }

  const { data, error: dataError } = await getJsonData(req, requestSchema);
  if (dataError) {
    return NextResponse.json({ message: dataError.message }, { status: 401 });
  }


  return NextResponse.json({
    producers: chains.filter(chain => data.ids.includes(chain.slug)).map((producer) => ({
      id: producer.id,
      name: producer.name,
      chainId: producer.id,
      slug: producer.slug,
    })),
  });
};

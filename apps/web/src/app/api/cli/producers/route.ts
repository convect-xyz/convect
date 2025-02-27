import { isNull, or } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "~/server/db";
import chains from "../../../../../../../config/chains.json";
import { getJsonData, getUserContext } from "../utils";

console.log(chains);
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

  const producers = await db.query.producers.findMany({
    where(fields, { eq, and }) {
      var filter = and();

      for (const id of data.ids) {
        const chainId = chains.find((c) => c.slug === id)?.id;
        console.log(chainId);
        if (chainId) {
          filter = or(
            filter,
            and(eq(fields.chainId, chainId), isNull(fields.userId)),
          );
        } else {
          throw new Error(`Invalid producer id: ${id}`);
        }
      }

      return filter;
    },
  });

  return NextResponse.json({
    producers: producers.map((producer) => ({
      id: producer.id,
      name: producer.name,
      chainId: producer.chainId,
      slug: chains.find((c) => c.id === producer.chainId)!.slug,
    })),
  });
};

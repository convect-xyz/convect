import { isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "~/server/db";
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

  const producers = await db.query.producers.findMany({
    where(fields, { eq, and }) {
      var filter = and();

      console.log(data.ids);
      for (const id of data.ids) {
        if (id === "blast-mainnet") {
          filter = and(
            filter,
            and(eq(fields.chainId, 81457), isNull(fields.userId)),
          );
        } else if (id === "eth-sepolia") {
          filter = and(
            filter,
            and(eq(fields.chainId, 11155111), isNull(fields.userId)),
          );
        } else if (id === "eth-mainnet") {
        } else {
          filter = and(filter, eq(fields.id, parseInt(id)));
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
    })),
  });
};

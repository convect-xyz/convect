import { isNull, or } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import {
  base,
  baseSepolia,
  blast,
  blastSepolia,
  mainnet,
  polygon,
  polygonAmoy,
  sepolia,
} from "viem/chains";
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

      const nameToId: Record<string, number> = {
        "blast-mainnet": blast.id,
        "blast-testnet": blastSepolia.id,
        "eth-mainnet": mainnet.id,
        "eth-sepolia": sepolia.id,
        "polygon-mainnet": polygon.id,
        "polygon-amoy": polygonAmoy.id,
        "base-mainnet": base.id,
        "base-sepolia": baseSepolia.id,
      };

      for (const id of data.ids) {
        const chainId = nameToId[id];
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
    })),
  });
};

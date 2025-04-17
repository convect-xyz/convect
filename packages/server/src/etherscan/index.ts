import { CaseInsensitiveMap } from "@convect-xyz/lib";
import { chunk } from "lodash";
import { z } from "zod";
import { Db } from "../db/db";
import { buildEtherscanAxios } from "./axios";

async function getProducer(chainId: number, db: Db) {
  const producer = await db.query.producers.findFirst({
    where(fields, { eq }) {
      return eq(fields.chainId, chainId);
    },
  });

  return producer;
}

export class EtherscanProvider {
  constructor(
    private chainId: number,
    private db: Db
  ) {}

  async getContractCreationTxHashes(_addresses: string[]) {
    const schema = z.object({
      result: z.array(
        z.object({
          contractAddress: z.string(),
          txHash: z.string(),
        })
      ),
    });

    const producer = await getProducer(this.chainId, this.db);
    const addresses = new Set(_addresses.map((a) => a.toLowerCase()));
    const results: CaseInsensitiveMap<string, string> =
      new CaseInsensitiveMap();

    for (const batch of chunk([...addresses], 5)) {
      const axios = buildEtherscanAxios(producer!.etherscanLike);

      const response = await axios.get(`/api`, {
        params: {
          module: "contract",
          action: "getcontractcreation",
          contractaddresses: batch.join(","),
          apikey: producer?.etherscanApiKey ?? undefined,
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 200));

      for (const result of schema.parse(response.data).result) {
        results.set(result.contractAddress, result.txHash);
      }
    }

    return results;
  }
}

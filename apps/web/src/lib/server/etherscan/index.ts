import { chunk } from "lodash";
import { z } from "zod";
import { db } from "~/server/db";
import { buildEtherscanAxios } from "./axios";

async function getProducer(chainId: number) {
  const producer = await db.query.producers.findFirst({
    where(fields, { eq }) {
      return eq(fields.chainId, chainId);
    },
  });

  return producer;
}

export class EtherscanProvider {
  constructor(private chainId: number) {
    this.chainId = chainId;
  }

  async getContractCreationTxHashes(_addresses: string[]) {
    console.log("_addresses", _addresses);
    const schema = z.object({
      result: z.array(
        z.object({
          contractAddress: z.string(),
          txHash: z.string(),
        }),
      ),
    });
    const addresses = new Set(_addresses.map((a) => a.toLowerCase()));
    console.log("addresses", addresses);
    const batches = chunk([...addresses], 5);
    const results: CaseInsensitiveMap<string, string> =
      new CaseInsensitiveMap();

    for (const batch of batches) {
      const producer = await getProducer(this.chainId);
      const axios = buildEtherscanAxios(producer!.etherscanLike);

      const response = await axios.get(`/api`, {
        params: {
          module: "contract",
          action: "getcontractcreation",
          contractaddresses: batch.join(","),
          apikey: producer?.etherscanApiKey ?? undefined,
        },
      });
      console.log(response.data);

      for (const result of schema.parse(await response.data).result) {
        results.set(result.contractAddress, result.txHash);
      }
    }

    return results;
  }
}

class CaseInsensitiveMap<T, U> extends Map<T, U> {
  set(key: T, value: U): this {
    if (typeof key === "string") {
      key = key.toLowerCase() as any as T;
    }
    return super.set(key, value);
  }

  get(key: T): U | undefined {
    if (typeof key === "string") {
      key = key.toLowerCase() as any as T;
    }

    return super.get(key);
  }

  has(key: T): boolean {
    if (typeof key === "string") {
      key = key.toLowerCase() as any as T;
    }

    return super.has(key);
  }
}

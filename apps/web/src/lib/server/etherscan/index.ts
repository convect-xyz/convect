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
    const schema = z.object({
      result: z.array(
        z.object({
          contractAddress: z.string(),
          txHash: z.string(),
        }),
      ),
    });
    const addresses = new Set(_addresses.map((a) => a.toLowerCase()));
    const batches = chunk([...addresses], 5);
    const results: Array<z.infer<typeof schema>> = [];

    for (const batch of batches) {
      const producer = await getProducer(this.chainId);
      const axios = buildEtherscanAxios(producer!.etherscanLike);

      const response = await axios.get(`/api`, {
        params: {
          module: "contract",
          action: "getcontractcreation",
          contractaddresses: batch.join(","),
          apikey: producer!.etherscanApiKey,
        },
      });

      results.push(schema.parse(await response.data));
    }

    return results.flatMap((r) => r.result).map((r) => r.txHash);
  }
}

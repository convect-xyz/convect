import { CaseInsensitiveMap } from "@convect-xyz/lib";
import { chains } from "@infra/config/chains";
import { chunk } from "lodash";
import { z } from "zod";
import { Db } from "../db/db";
import { buildEtherscanAxios } from "./axios";

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

    const chain = chains.find((c) => c.id === this.chainId);
    if (!chain) {
      throw new Error(`Chain not found ${this.chainId}`);
    }
    const addresses = new Set(_addresses.map((a) => a.toLowerCase()));
    const results: CaseInsensitiveMap<string, string> =
      new CaseInsensitiveMap();

    for (const batch of chunk([...addresses], 5)) {
      const axios = buildEtherscanAxios(chain.etherscan_like);

      const response = await axios.get("/v2/api", {
        params: {
          chainId: chain.id,
          module: "contract",
          action: "getcontractcreation",
          contractaddresses: batch.join(","),
          apikey: chain.etherscan_api_key,
        },
      });

      console.log(response.data);

      await new Promise((resolve) => setTimeout(resolve, 600));

      for (const result of schema.parse(response.data).result) {
        results.set(result.contractAddress, result.txHash);
      }
    }

    return results;
  }

  async getBlockNumberByTime(timestamp: number) {
    const schema = z.object({
      result: z.coerce.number(),
    });

    const chain = chains.find((c) => c.id === this.chainId);
    if (!chain) {
      throw new Error(`Chain not found ${this.chainId}`);
    }
    const axios = buildEtherscanAxios(chain.etherscan_like);

    const response = await axios.get("/api", {
      params: {
        module: "block",
        action: "getblocknobytime",
        timestamp,
        closest: "after",
        apikey: chain.etherscan_api_key,
      },
    });

    return schema.parse(response.data).result;
  }
}

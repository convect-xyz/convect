import {
  CaseInsensitiveMap,
  getAddress,
  getLogConfigsForTxConfig,
  getStartBlock,
  getStructuredManifest,
  Manifest,
} from "@convect-xyz/lib";
import { Hex, PublicClient, TransactionReceipt } from "viem";
import { Db } from "../db/db";
import { AppError } from "../error";
import { EtherscanProvider } from "../etherscan";
import { getPublicClient } from "../viem/client";

type TxReceiptRegistry = Map<
  number,
  CaseInsensitiveMap<string, TransactionReceipt>
>;

export class ContractsNotFoundError extends AppError {
  constructor(chainId: number, txConfigName: string, addresses: string[]) {
    super(
      `[${txConfigName}] Contracts not found for chain ${chainId}: ${addresses.join(", ")}`
    );
  }
}

export class MissingContractsForChainError extends AppError {
  constructor(chainId: number, addresses: string[]) {
    super(
      `No contracts specified for chain ${chainId}: ${addresses.join(", ")}`
    );
  }
}

async function getTxReceipts(
  addresssToTxHash: CaseInsensitiveMap<string, string>,
  client: PublicClient
) {
  const entries = Array.from(addresssToTxHash.entries());
  const result = new CaseInsensitiveMap<string, TransactionReceipt>();

  await Promise.allSettled(
    entries.map(([address, txHash]) =>
      client
        .getTransactionReceipt({
          hash: txHash as Hex,
        })
        .then((receipt) => {
          result.set(address, receipt);
        })
    )
  );

  return result;
}

export class ManifestValidationService {
  constructor(private db: Db) {}

  async validate(manifest: Manifest) {
    const txReceiptRegistryByChain =
      await this._getTxReceiptRegistryByChain(manifest);
    await this._updateStartBlocks(manifest, txReceiptRegistryByChain);
  }

  async _getTxReceiptRegistryByChain(manifest: Manifest) {
    const txReceiptRegistry: TxReceiptRegistry = new Map();
    const structuredManifest = getStructuredManifest(manifest);

    for (const chain of structuredManifest.chains) {
      const publicClient = getPublicClient(chain.chainId);

      const allAddresses = [
        ...new Set(
          structuredManifest.txConfigs
            .filter(
              (txConfig) =>
                !txConfig.chains || txConfig.chains.includes(chain.chainId)
            )
            .flatMap((txConfig) => txConfig.logConfigs)
            .map((logConfig) => getAddress(chain.chainId, logConfig)!)
        ),
      ];

      const etherscanProvider = new EtherscanProvider(chain.chainId, this.db);
      console.log(`[${chain.chainId}] allAddresses: ${allAddresses}`);
      const addressToTxHash =
        await etherscanProvider.getContractCreationTxHashes(allAddresses);
      const addressToTxReceipt = await getTxReceipts(
        addressToTxHash,
        publicClient
      );
      txReceiptRegistry.set(chain.chainId, addressToTxReceipt);
    }
    return txReceiptRegistry;
  }

  async _updateStartBlocks(
    manifest: Manifest,
    txReceiptRegistry: TxReceiptRegistry
  ) {
    for (const chain of manifest.chains) {
      const addressToTxReceipt = txReceiptRegistry.get(chain.chainId)!;

      for (var i = 0; i < manifest.tx_configs.length; i++) {
        const txConfig = manifest.tx_configs[i]!;
        if (txConfig.chains && !txConfig.chains.includes(chain.chainId)) {
          continue;
        }

        const addresses = getLogConfigsForTxConfig(manifest, i).map(
          (logConfig) => getAddress(chain.chainId, logConfig)!
        );

        const receiptNotFoundAddresses = addresses.filter(
          (address) => !addressToTxReceipt.has(address)
        );
        if (receiptNotFoundAddresses.length > 0) {
          throw new ContractsNotFoundError(
            chain.chainId,
            txConfig.name,
            receiptNotFoundAddresses
          );
        }

        const minBlock = Number(
          addresses
            .map((address) => addressToTxReceipt.get(address)!.blockNumber)
            .reduce((l, r) => (r > l ? r : l))
        );
        txConfig.start_block[chain.chainId.toString()] = Math.max(
          minBlock,
          getStartBlock(chain.chainId, txConfig)
        );
      }
    }
  }
}

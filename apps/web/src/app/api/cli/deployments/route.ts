import {
  getAddress,
  getStartBlock,
  Manifest,
  parseManifest,
} from "@convect-xyz/lib";
import { ConvectFunctionFacade } from "@convect-xyz/server";
import { NextRequest, NextResponse } from "next/server";
import { v4 } from "uuid";
import { Hex } from "viem";
import { z } from "zod";
import { env } from "~/env";
import { ecs, s3 } from "~/lib/server/aws";
import { EtherscanProvider } from "~/lib/server/etherscan";
import { getPublicClient } from "~/lib/server/viem/client";
import { monikerRegex } from "~/lib/shared/validation";
import { getStackOutputs } from "~/server/actions/pulumi/getStackOutputs";
import { db } from "~/server/db";
import { getConvectFn, getFormData, getUserContext } from "../utils";

const zodId = z
  .string()
  .transform((v) => v.split("/"))
  .pipe(
    z.tuple([z.string().regex(monikerRegex), z.string().regex(monikerRegex)]),
  )
  .transform(([project, convectFn]) => ({ project, convectFn }));

const requestSchema = z.object({
  mode: z.literal("init"),
  id: zodId,
  handler: z.instanceof(Blob),
  manifest: z.instanceof(Blob),
  override: z.coerce.boolean(),
});

export const POST = async (req: NextRequest) => {
  const { user, error: userError } = await getUserContext(req);
  if (userError) {
    return NextResponse.json({ message: userError.message }, { status: 401 });
  }

  const { data, error: dataError } = await getFormData(req, requestSchema);
  if (dataError) {
    return NextResponse.json({ message: dataError.message }, { status: 401 });
  }

  const fn = await getConvectFn({
    convectFn: data.id.convectFn,
    project: data.id.project,
    userId: user.id,
  });
  if (!fn) {
    return NextResponse.json(
      { message: `Could not find function.` },
      { status: 401 },
    );
  }

  const convectFn = new ConvectFunctionFacade(fn.convectFunction.id, {
    s3,
    db,
    ecs,
  });

  const manifest = await updateStartBlocks(
    parseManifest(await data.manifest.text()),
  );

  const deploymentId = v4();
  await Promise.all([
    convectFn.writeCode({
      deploymentId,
      bundledCode: await data.handler.text(),
    }),
    convectFn.writeManifest(manifest, deploymentId),
  ]);

  const stackOutputs = await getStackOutputs();
  await convectFn.createDeployment({
    deploymentId,
    version: fn.convectFunction.infraVersion!,
    manifest: manifest,
    mode: data.mode,
    builderTaskDefinition: stackOutputs.builderTaskDefinition,
    dbUrl: env.DATABASE_URL,
    encryptionKey: env.ENCRYPTION_KEY,
  });

  return NextResponse.json({});
};

async function updateStartBlocks(manifest: Manifest) {
  manifest = { ...manifest };

  for (const chain of manifest.chains) {
    for (var i = 0; i < manifest.tx_configs.length; i++) {
      const txConfig = manifest.tx_configs[i]!;
      const logConfigs = manifest.log_configs.filter((logConfig) =>
        logConfig.tx_configs.includes(i),
      );
      const contractAddresses = logConfigs.map((logConfig) => {
        return getAddress(chain.chainId, logConfig);
      });

      const etherscanProvider = new EtherscanProvider(chain.chainId);
      const txHashes =
        await etherscanProvider.getContractCreationTxHashes(contractAddresses);
      const client = getPublicClient(chain.chainId);

      const receipts = await Promise.all(
        txHashes.map((txHash) =>
          client.getTransactionReceipt({
            hash: txHash as Hex,
          }),
        ),
      );

      const minBlock = Number(
        receipts.map((r) => r.blockNumber).reduce((m, e) => (e > m ? e : m)),
      );
      txConfig.start_block[chain.chainId.toString()] = Math.max(
        minBlock,
        getStartBlock(chain.chainId, txConfig),
      );
    }
  }

  return manifest;
}

import { S3 } from "@aws-sdk/client-s3";
import { Manifest } from "@convect-xyz/lib";
import { getManifestBucket, getManifestPrefix } from "./utils";

export class _ManifestService {
  config: {
    s3: S3;
  };

  constructor(options: { s3: S3 }) {
    this.config = options;
  }

  async read(functionId: number, deploymentId: string) {
    const response = await this.config.s3.getObject({
      Bucket: getManifestBucket(),
      Key: getManifestPrefix(functionId, deploymentId),
    });

    if (response.Body === undefined) {
      throw new Error("Manifest not found");
    }

    return await response.Body?.transformToString();
  }

  async write(functionId: number, deploymentId: string, manifest: Manifest) {
    return this.config.s3.putObject({
      Bucket: getManifestBucket(),
      Key: getManifestPrefix(functionId, deploymentId),
      Body: JSON.stringify(manifest),
    });
  }
}

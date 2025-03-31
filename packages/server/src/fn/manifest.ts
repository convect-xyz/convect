import { S3 } from "@aws-sdk/client-s3";
import { Manifest } from "@convect-xyz/lib";
import { eq } from "drizzle-orm";
import { schema } from "..";
import { Db } from "../db/db";
import { getManifestBucket, getManifestPrefix } from "./utils";

export class _ManifestService {
  config: {
    db: Db;
    s3: S3;
  };

  constructor(options: { s3: S3; db: Db }) {
    this.config = options;
  }

  async readFromS3(functionId: number, deploymentId: string) {
    const response = await this.config.s3.getObject({
      Bucket: getManifestBucket(),
      Key: getManifestPrefix(functionId, deploymentId),
    });

    if (response.Body === undefined) {
      throw new Error("Manifest not found");
    }

    return await response.Body?.transformToString();
  }

  async writeToS3(
    functionId: number,
    deploymentId: string,
    manifest: Manifest
  ) {
    return this.config.s3.putObject({
      Bucket: getManifestBucket(),
      Key: getManifestPrefix(functionId, deploymentId),
      Body: JSON.stringify(manifest),
    });
  }

  async update(functionId: number, deploymentId: string, manifest: Manifest) {
    await this.config.db
      .update(schema.deployment)
      .set({
        manifest: JSON.stringify(manifest),
      })
      .where(eq(schema.deployment.id, deploymentId));

    return this.writeToS3(functionId, deploymentId, manifest);
  }
}

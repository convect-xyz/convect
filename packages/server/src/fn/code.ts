import { S3 } from "@aws-sdk/client-s3";
import { getCodeBucket, getCodePrefix } from "./utils";

export class _CodeService {
  config: {
    s3: S3;
  };

  constructor(options: { s3: S3 }) {
    this.config = options;
  }

  async writeBundledCode(
    functionId: number,
    deploymentId: string,
    bundledCode: string
  ) {
    return this.config.s3.putObject({
      Bucket: getCodeBucket(),
      Key: getCodePrefix(functionId, deploymentId),
      Body: bundledCode,
    });
  }
}

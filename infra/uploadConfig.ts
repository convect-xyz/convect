import * as AWS from "aws-sdk";
import * as crypto from "crypto";
import config from "./config/config";

const s3 = new AWS.S3();

const main = async () => {
  const bucketName = "convect-pzecvtjr9v";
  const objectKey = `config/${process.env.INFRA_VERSION}-config.json`;
  const configData = JSON.stringify(config);

  // Generate a 32-byte encryption key
  const encryptionKey = Buffer.from(
    process.env.CONFIG_ENCRYPTION_PRIVATE_KEY!,
    "base64"
  );
  const encryptionAlgorithm = process.env.CONFIG_ENCRYPTION_ALGORITHM!;

  const encryptionKeyMd5 = crypto
    .createHash("md5")
    .update(encryptionKey)
    .digest("base64");

  await s3
    .putObject({
      Bucket: bucketName,
      Key: objectKey,
      Body: configData,
      SSECustomerAlgorithm: encryptionAlgorithm,
      SSECustomerKey: encryptionKey,
      SSECustomerKeyMD5: encryptionKeyMd5,
    })
    .promise();

  return {
    bucket: bucketName,
    key: objectKey,
  };
};

main().then((result) => console.log(result));

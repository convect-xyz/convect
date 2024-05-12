import crypto, { randomBytes } from "crypto";
import { env } from "~/env";

const encryptionKey = env.ENCRYPTION_KEY;

export const encryptEnvValue = (value: string) => {
  const iv = randomBytes(16);

  let cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(encryptionKey, "hex"),
    iv,
  );

  let encrypted = cipher.update(value);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  return { value: encrypted.toString("hex"), iv: iv.toString("hex") };
};

export const decryptEnvValue = (encryptedValue: string, _iv: string) => {
  let iv = Buffer.from(_iv, "hex");
  let encryptedText = Buffer.from(encryptedValue, "hex");
  let decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(encryptionKey, "hex"),
    iv,
  );
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString("utf-8");
};

import crypto from "crypto";

type EncryptedBotKey = {
  ciphertext: string;
  iv: string;
  tag: string;
};

const ENCRYPTION_ALGO = "aes-256-gcm";
const IV_LENGTH = 12;

function getEncryptionKey(): Buffer {
  const secret = process.env.BOT_KEY_ENC_KEY;
  if (!secret) {
    throw new Error("Missing BOT_KEY_ENC_KEY env var");
  }

  const secretBytes = Buffer.from(secret, "utf8");
  if (secretBytes.length === 32) {
    return secretBytes;
  }

  return Buffer.from(
    crypto.hkdfSync(
      "sha256",
      secretBytes,
      Buffer.from("bot-key-encryption"),
      Buffer.from("bot-key-v1"),
      32
    )
  );
}

export function getKeyVersion(): number {
  const parsed = Number.parseInt(process.env.BOT_KEY_ENC_KEY_VERSION || "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function hashBotKey(botKey: string): string {
  return crypto.createHash("sha256").update(botKey, "utf8").digest("hex");
}

export function encryptBotKey(
  botKey: string,
  userId: string,
  botKeyId: string
): EncryptedBotKey {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGO, key, iv);
  cipher.setAAD(Buffer.from(`${userId}:${botKeyId}`, "utf8"));

  const ciphertext = Buffer.concat([cipher.update(botKey, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64")
  };
}

export function decryptBotKey(
  encrypted: EncryptedBotKey,
  userId: string,
  botKeyId: string
): string {
  const key = getEncryptionKey();
  const iv = Buffer.from(encrypted.iv, "base64");
  const tag = Buffer.from(encrypted.tag, "base64");
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGO, key, iv);
  decipher.setAAD(Buffer.from(`${userId}:${botKeyId}`, "utf8"));
  decipher.setAuthTag(tag);

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(encrypted.ciphertext, "base64")),
    decipher.final()
  ]);

  return plaintext.toString("utf8");
}

import * as crypto from "crypto";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;

export default class Security {
  encoding: BufferEncoding = "hex";
  private readonly key: Buffer;

  constructor() {
    const key = process.env.CRYPTO_KEY ?? "";
    this.key = Buffer.from(key, "hex");
    if (this.key.length !== 32) {
      throw new Error("Invalid key length: CRYPTO_KEY must be 32 bytes hex (64 chars)");
    }
  }

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, "utf-8"),
      cipher.final(),
    ]);
    return `${iv.toString(this.encoding)}:${encrypted.toString(this.encoding)}`;
  }

  decrypt(ciphertext: string): string {
    if (ciphertext.includes(":")) {
      const [ivHex, dataHex] = ciphertext.split(":");
      const iv = Buffer.from(ivHex, this.encoding);
      const data = Buffer.from(dataHex, this.encoding);
      const decipher = crypto.createDecipheriv("aes-256-cbc", this.key, iv);
      return Buffer.concat([decipher.update(data), decipher.final()]).toString(
        "utf-8"
      );
    }

    // Legacy fixed-IV ciphertexts from earlier builds
    const data = Buffer.from(ciphertext, this.encoding);
    const iv = Buffer.alloc(16, 0);
    const decipher = crypto.createDecipheriv("aes-256-cbc", this.key, iv);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      "utf-8"
    );
  }

  /** Legacy SHA-256 hash (kept for migrating existing accounts). */
  hash(message: string): string {
    return crypto.createHash("sha256").update(message, "utf8").digest("hex");
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  async verifyPassword(
    password: string,
    stored: string
  ): Promise<{ ok: boolean; needsRehash: boolean }> {
    if (stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$")) {
      const ok = await bcrypt.compare(password, stored);
      return { ok, needsRehash: false };
    }

    // Legacy SHA-256 — accept once, then upgrade to bcrypt
    const ok = this.hash(password) === stored;
    return { ok, needsRehash: ok };
  }
}

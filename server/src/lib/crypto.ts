import { createCipheriv, createDecipheriv, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

export function otpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** One-time codes are stored only as a keyed hash bound to the email. */
export function hashOtp(secret: string, email: string, code: string): string {
  return createHmac("sha256", secret).update(`${email}:${code}`).digest("hex");
}

export function safeEqualHex(a: string, b: string): boolean {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && timingSafeEqual(x, y);
}

/** AES-256-GCM for passport numbers. Output: iv.tag.ciphertext (base64url). */
export function encrypt(key: Buffer, plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), data].map((b) => b.toString("base64url")).join(".");
}

export function decrypt(key: Buffer, packed: string): string {
  const [iv, tag, data] = packed.split(".").map((p) => Buffer.from(p, "base64url"));
  if (!iv || !tag || !data) throw new Error("Malformed ciphertext");
  const d = createDecipheriv("aes-256-gcm", key, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(data), d.final()]).toString("utf8");
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function shortCode(len: number): string {
  let s = "";
  for (let i = 0; i < len; i++) s += ALPHABET[randomInt(0, ALPHABET.length)];
  return s;
}

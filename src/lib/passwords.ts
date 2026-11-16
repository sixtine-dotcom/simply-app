import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => scryptCallback(password, salt, 64, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key)));
}
const PREFIX = "scrypt-v1";

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = await derive(password, salt);
  return `${PREFIX}$${salt}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string | null | undefined) {
  const parts = encoded?.split("$") || [];
  const valid = parts.length === 3 && parts[0] === PREFIX && /^[a-f0-9]{32}$/.test(parts[1]) && /^[a-f0-9]{128}$/.test(parts[2]);
  // Use the same expensive operation for missing accounts/hashes.
  const salt = valid ? parts[1] : "0".repeat(32);
  const key = await derive(password, salt);
  const expected = valid ? Buffer.from(parts[2], "hex") : Buffer.alloc(64);
  return timingSafeEqual(key, expected) && valid;
}

import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, KEY_LENGTH);
  return `${salt}:${key.toString("hex")}`;
}

export async function verifyPassword(password, storedHash) {
  if (typeof storedHash !== "string" || !storedHash.includes(":")) return false;
  const [salt, expectedHex] = storedHash.split(":");
  const expected = Buffer.from(expectedHex, "hex");
  if (expected.length !== KEY_LENGTH) return false;
  const actual = await scrypt(password, salt, KEY_LENGTH);
  return timingSafeEqual(expected, actual);
}

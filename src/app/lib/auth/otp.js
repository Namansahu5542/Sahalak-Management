import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

function getOtpSecret() {
  const secret = process.env.AUTH_SECRET || process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("Missing AUTH_SECRET for email verification");
  return secret;
}

export function createOtp() {
  return String(randomInt(0, 100_000_000)).padStart(8, "0");
}

export function digestOtp(email, otp) {
  return createHmac("sha256", getOtpSecret()).update(`${email}:${otp}`).digest("hex");
}

export function isOtpMatch(email, otp, expectedDigest) {
  const expected = Buffer.from(expectedDigest || "", "hex");
  const actual = Buffer.from(digestOtp(email, otp), "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

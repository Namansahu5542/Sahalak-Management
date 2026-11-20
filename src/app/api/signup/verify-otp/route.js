import { NextResponse } from "next/server";
import { getDatabase } from "@/app/lib/db/mongodb";
import { isOtpMatch } from "@/app/lib/auth/otp";
import { ensureSignupIndexes, PENDING_SIGNUPS, USERS } from "@/app/lib/auth/signup";

function validOrigin(request) {
  const origin = request.headers.get("origin");
  try {
    return Boolean(origin) && new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export async function POST(request) {
  if (!validOrigin(request)) return NextResponse.json({ error: "Request could not be verified." }, { status: 403 });

  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter the verification code." }, { status: 400 });
  }
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const otp = typeof input.otp === "string" ? input.otp.trim() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{8}$/.test(otp)) {
    return NextResponse.json({ error: "Enter the 8-digit code from your email." }, { status: 400 });
  }

  try {
    const db = await getDatabase();
    await ensureSignupIndexes(db);
    const pending = db.collection(PENDING_SIGNUPS);
    const signup = await pending.findOne({ email });
    if (!signup || signup.expiresAt <= new Date() || signup.attempts >= 5) {
      return NextResponse.json({ error: "This code has expired or cannot be used. Request a new code." }, { status: 400 });
    }

    if (!isOtpMatch(email, otp, signup.otpDigest)) {
      await pending.updateOne({ _id: signup._id }, { $inc: { attempts: 1 } });
      return NextResponse.json({ error: "That code does not match. Check it and try again." }, { status: 400 });
    }

    await db.collection(USERS).insertOne({
      name: signup.name,
      email,
      passwordHash: signup.passwordHash,
      role: "user",
      emailVerifiedAt: new Date(),
      createdAt: new Date(),
    });
    await pending.deleteOne({ _id: signup._id });
    return NextResponse.json({ message: "Email verified. Your account is ready." });
  } catch (error) {
    if (error?.code === 11000) return NextResponse.json({ error: "An account with this email already exists. Try logging in instead." }, { status: 409 });
    console.error("Signup code verification failed");
    return NextResponse.json({ error: "Verification is temporarily unavailable. Please try again." }, { status: 500 });
  }
}

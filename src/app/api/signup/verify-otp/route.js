import { NextResponse } from "next/server";
import { connectMongoose } from "@/app/lib/db/mongoose";
import User from "@/app/lib/models/User";
import PendingSignup from "@/app/lib/models/PendingSignup";
import { isOtpMatch } from "@/app/lib/auth/otp";

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
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return NextResponse.json({ error: "Enter the verification code." }, { status: 400 });
  }
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const otp = typeof input.otp === "string" ? input.otp.trim() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{8}$/.test(otp)) {
    return NextResponse.json({ error: "Enter the 8-digit code from your email." }, { status: 400 });
  }

  try {
    await connectMongoose();
    await Promise.all([User.init(), PendingSignup.init()]);
    const signup = await PendingSignup.findOne({ email });
    if (!signup || signup.expiresAt <= new Date() || signup.attempts >= 5) {
      return NextResponse.json({ error: "This code has expired or cannot be used. Request a new code." }, { status: 400 });
    }

    if (!isOtpMatch(email, otp, signup.otpDigest)) {
      await PendingSignup.updateOne({ _id: signup._id, attempts: { $lt: 5 } }, { $inc: { attempts: 1 } });
      return NextResponse.json({ error: "That code does not match. Check it and try again." }, { status: 400 });
    }

    await User.create({
      name: signup.name,
      email,
      passwordHash: signup.passwordHash,
      role: signup.role === "owner" ? "owner" : "user",
      emailVerifiedAt: new Date(),
      createdAt: new Date(),
    });
    await PendingSignup.deleteOne({ _id: signup._id });
    return NextResponse.json({ message: "Email verified. Your account is ready." });
  } catch (error) {
    if (error?.code === 11000) return NextResponse.json({ error: "An account with this email already exists. Try logging in instead." }, { status: 409 });
    const errorMessage = String(error?.message || "").replace(/mongodb(?:\+srv)?:\/\/\S+/gi, "[database URI]");
    console.error("Signup code verification failed", { name: error?.name, code: error?.code, message: errorMessage });
    const message = process.env.NODE_ENV === "development"
      ? `Verification is temporarily unavailable (${error?.name || "UnknownError"}). Check the terminal log.`
      : "Verification is temporarily unavailable. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

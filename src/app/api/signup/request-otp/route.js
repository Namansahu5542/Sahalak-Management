import { NextResponse } from "next/server";
import { connectMongoose } from "@/app/lib/db/mongoose";
import User from "@/app/lib/models/User";
import PendingSignup from "@/app/lib/models/PendingSignup";
import { hashPassword } from "@/app/lib/auth/password";
import { createOtp, digestOtp } from "@/app/lib/auth/otp";

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
    return NextResponse.json({ error: "Enter valid signup details." }, { status: 400 });
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return NextResponse.json({ error: "Enter valid signup details." }, { status: 400 });
  }

  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";
  const role = input.role === "owner" ? "owner" : input.role === "user" || input.role === undefined ? "user" : null;
  if (!role || name.length < 2 || name.length > 80 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || password.length < 10 || password.length > 128) {
    return NextResponse.json({ error: "Use a valid name and email, and a password of at least 10 characters." }, { status: 400 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM;
  if (!resendKey || !emailFrom) {
    return NextResponse.json({ error: "Email verification is not configured yet. Add RESEND_API_KEY and EMAIL_FROM to .env.local." }, { status: 503 });
  }

  try {
    await connectMongoose();
    await Promise.all([User.init(), PendingSignup.init()]);
    if (await User.exists({ email })) {
      return NextResponse.json({ error: "An account with this email already exists. Try logging in instead." }, { status: 409 });
    }

    const previous = await PendingSignup.findOne({ email }).lean();
    if (previous && Date.now() - previous.updatedAt.getTime() < 60_000) {
      return NextResponse.json({ error: "Please wait a minute before requesting another code." }, { status: 429 });
    }

    const otp = createOtp();
    const now = new Date();
    await PendingSignup.findOneAndUpdate(
      { email },
      {
        $set: {
          name,
          email,
          role,
          passwordHash: await hashPassword(password),
          otpDigest: digestOtp(email, otp),
          attempts: 0,
          updatedAt: now,
          expiresAt: new Date(now.getTime() + 10 * 60_000),
        },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: emailFrom,
        to: [email],
        subject: "Verify your Sahalak account",
        text: `Hi ${name}, your Sahalak verification code is ${otp}. It expires in 10 minutes. If you did not request this code, you can ignore this email.`,
      }),
      cache: "no-store",
    });

    if (!emailResponse.ok) {
      await PendingSignup.deleteOne({ email });
      console.error("Email provider rejected signup verification request", emailResponse.status);
      return NextResponse.json({ error: "We could not send the verification code. Please try again shortly." }, { status: 502 });
    }

    return NextResponse.json({ message: "Verification code sent. Check your inbox." });
  } catch (error) {
    const errorMessage = String(error?.message || "").replace(/mongodb(?:\+srv)?:\/\/\S+/gi, "[database URI]");
    console.error("Signup verification request failed", { name: error?.name, code: error?.code, message: errorMessage });
    const message = process.env.NODE_ENV === "development"
      ? `Signup is temporarily unavailable (${error?.name || "UnknownError"}). Check the terminal log.`
      : "Signup is temporarily unavailable. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

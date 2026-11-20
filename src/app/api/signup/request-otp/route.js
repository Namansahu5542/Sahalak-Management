import { NextResponse } from "next/server";
import { getDatabase } from "@/app/lib/db/mongodb";
import { hashPassword } from "@/app/lib/auth/password";
import { createOtp, digestOtp } from "@/app/lib/auth/otp";
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
    return NextResponse.json({ error: "Enter valid signup details." }, { status: 400 });
  }

  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";
  if (name.length < 2 || name.length > 80 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || password.length < 10 || password.length > 128) {
    return NextResponse.json({ error: "Use a valid name and email, and a password of at least 10 characters." }, { status: 400 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM;
  if (!resendKey || !emailFrom) {
    return NextResponse.json({ error: "Email verification is not configured yet. Add RESEND_API_KEY and EMAIL_FROM to .env.local." }, { status: 503 });
  }

  try {
    const db = await getDatabase();
    await ensureSignupIndexes(db);
    const users = db.collection(USERS);
    if (await users.findOne({ email }, { projection: { _id: 1 } })) {
      return NextResponse.json({ error: "An account with this email already exists. Try logging in instead." }, { status: 409 });
    }

    const pending = db.collection(PENDING_SIGNUPS);
    const previous = await pending.findOne({ email });
    if (previous && Date.now() - previous.updatedAt.getTime() < 60_000) {
      return NextResponse.json({ error: "Please wait a minute before requesting another code." }, { status: 429 });
    }

    const otp = createOtp();
    const now = new Date();
    await pending.updateOne(
      { email },
      {
        $set: {
          name,
          email,
          passwordHash: await hashPassword(password),
          otpDigest: digestOtp(email, otp),
          attempts: 0,
          updatedAt: now,
          expiresAt: new Date(now.getTime() + 10 * 60_000),
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
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
      await pending.deleteOne({ email });
      console.error("Email provider rejected signup verification request", emailResponse.status);
      return NextResponse.json({ error: "We could not send the verification code. Please try again shortly." }, { status: 502 });
    }

    return NextResponse.json({ message: "Verification code sent. Check your inbox." });
  } catch (error) {
    console.error("Signup verification request failed");
    return NextResponse.json({ error: "Signup is temporarily unavailable. Please try again." }, { status: 500 });
  }
}

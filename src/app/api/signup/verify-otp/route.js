import { NextResponse } from "next/server";
import { sql } from "@/app/lib/db";
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
    const [signup] = await sql`select * from pending_signups where email = ${email} limit 1`;
    if (!signup || signup.expiresAt <= new Date() || signup.attempts >= 5) {
      return NextResponse.json({ error: "This code has expired or cannot be used. Request a new code." }, { status: 400 });
    }

    if (!isOtpMatch(email, otp, signup.otpDigest)) {
      await sql`update pending_signups set attempts = attempts + 1 where id = ${signup.id} and attempts < 5`;
      return NextResponse.json({ error: "That code does not match. Check it and try again." }, { status: 400 });
    }

    const role = signup.role === "owner" ? "owner" : "user";
    await sql.begin(async (tx) => {
      await tx`
        insert into users (name, email, password_hash, role, email_verified_at)
        values (${signup.name}, ${email}, ${signup.passwordHash}, ${role}, now())`;
      await tx`delete from pending_signups where id = ${signup.id}`;
    });

    return NextResponse.json({ message: "Email verified. Your account is ready." });
  } catch (error) {
    if (error?.code === "23505") {
      return NextResponse.json({ error: "An account with this email already exists. Try logging in instead." }, { status: 409 });
    }
    const errorMessage = String(error?.message || "").replace(/postgres(?:ql)?:\/\/\S+/gi, "[database URL]");
    console.error("Signup code verification failed", { name: error?.name, code: error?.code, message: errorMessage });
    const message = process.env.NODE_ENV === "development"
      ? `Verification is temporarily unavailable (${error?.name || "UnknownError"}). Check the terminal log.`
      : "Verification is temporarily unavailable. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
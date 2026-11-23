import { NextResponse } from "next/server";
import { sql } from "@/app/lib/db";
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
    // Postgres has no automatic expiry like MongoDB's TTL index, so clean up here.
    await sql`delete from pending_signups where expires_at < now()`;

    const [existingUser] = await sql`select 1 as found from users where email = ${email} limit 1`;
    if (existingUser) {
      return NextResponse.json({ error: "An account with this email already exists. Try logging in instead." }, { status: 409 });
    }

    const [previous] = await sql`select updated_at from pending_signups where email = ${email} limit 1`;
    if (previous && Date.now() - previous.updatedAt.getTime() < 60_000) {
      return NextResponse.json({ error: "Please wait a minute before requesting another code." }, { status: 429 });
    }

    const otp = createOtp();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60_000);
    const passwordHash = await hashPassword(password);
    const otpDigest = digestOtp(email, otp);

    await sql`
      insert into pending_signups (email, name, role, password_hash, otp_digest, attempts, updated_at, expires_at)
      values (${email}, ${name}, ${role}, ${passwordHash}, ${otpDigest}, 0, ${now}, ${expiresAt})
      on conflict (email) do update set
        name = excluded.name,
        role = excluded.role,
        password_hash = excluded.password_hash,
        otp_digest = excluded.otp_digest,
        attempts = 0,
        updated_at = excluded.updated_at,
        expires_at = excluded.expires_at`;

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
      await sql`delete from pending_signups where email = ${email}`;
      console.error("Email provider rejected signup verification request", emailResponse.status);
      return NextResponse.json({ error: "We could not send the verification code. Please try again shortly." }, { status: 502 });
    }

    return NextResponse.json({ message: "Verification code sent. Check your inbox." });
  } catch (error) {
    const errorMessage = String(error?.message || "").replace(/postgres(?:ql)?:\/\/\S+/gi, "[database URL]");
    console.error("Signup verification request failed", { name: error?.name, code: error?.code, message: errorMessage });
    const message = process.env.NODE_ENV === "development"
      ? `Signup is temporarily unavailable (${error?.name || "UnknownError"}). Check the terminal log.`
      : "Signup is temporarily unavailable. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
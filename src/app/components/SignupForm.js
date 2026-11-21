"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

const fieldClass = "mt-1.5 h-11 w-full rounded-xl border border-[#6C5636] bg-[#090907]/80 px-3.5 text-sm text-[#F5F3EF] outline-none placeholder:text-[#F5F3EF]/35 focus:border-[#B99D73] focus:ring-2 focus:ring-[#B99D73]/20";

async function readJson(response) {
  return response.json().catch(() => ({}));
}

export default function SignupForm({ accountRole = "user" }) {
  const router = useRouter();
  const [stage, setStage] = useState("details");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "", otp: "" });

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function requestCode(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (form.password !== form.confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/signup/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password, role: accountRole }),
      });
      const result = await readJson(response);
      if (!response.ok) throw new Error(result.error || "Could not send the verification code.");
      setStage("verify");
      setMessage(result.message || "Verification code sent. Check your inbox.");
    } catch (requestError) {
      setError(requestError.message || "Could not send the verification code.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const response = await fetch("/api/signup/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, otp: form.otp }),
      });
      const result = await readJson(response);
      if (!response.ok) throw new Error(result.error || "We could not verify that code.");

      const session = await signIn("credentials", { email: form.email, password: form.password, redirect: false });
      if (!session?.ok) throw new Error("Your account is ready. Please log in to continue.");
      router.replace(accountRole === "owner" ? "/owner/setup" : "/dashboard/Home");
      router.refresh();
    } catch (verificationError) {
      setError(verificationError.message || "We could not verify that code.");
    } finally {
      setBusy(false);
    }
  }

  async function githubSignup() {
    setError("");
    setBusy(true);
    try {
      await signIn("github", { redirectTo: accountRole === "owner" ? "/owner/setup" : "/dashboard/Home" });
    } catch {
      setError("GitHub sign up could not start. Please try again.");
      setBusy(false);
    }
  }

  return (
    <>
      <form onSubmit={stage === "details" ? requestCode : verifyCode} className="grid gap-3.5" noValidate>
        {stage === "details" ? (
          <>
            <label className="block text-xs font-semibold text-[#F5F3EF]/85" htmlFor="signup-name">Name
              <input className={fieldClass} id="signup-name" name="name" autoComplete="name" value={form.name} onChange={update} minLength={2} maxLength={80} required placeholder="Your name" />
            </label>
            <label className="block text-xs font-semibold text-[#F5F3EF]/85" htmlFor="signup-email">Email address
              <input className={fieldClass} id="signup-email" name="email" type="email" autoComplete="email" value={form.email} onChange={update} maxLength={254} required placeholder="you@example.com" />
            </label>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-[#F5F3EF]/85" htmlFor="signup-password">Password
                <input className={fieldClass} id="signup-password" name="password" type="password" autoComplete="new-password" value={form.password} onChange={update} minLength={10} maxLength={128} required placeholder="At least 10 characters" />
              </label>
              <label className="block text-xs font-semibold text-[#F5F3EF]/85" htmlFor="signup-confirm-password">Confirm password
                <input className={fieldClass} id="signup-confirm-password" name="confirmPassword" type="password" autoComplete="new-password" value={form.confirmPassword} onChange={update} minLength={10} maxLength={128} required placeholder="Enter it again" />
              </label>
            </div>
            <button disabled={busy} type="submit" className="mt-1 h-12 rounded-xl bg-[#B99D73] px-5 text-sm font-bold text-[#090907] transition hover:bg-[#cfb894] disabled:cursor-wait disabled:opacity-60">
              {busy ? "Sending code…" : "Send verification code"}
            </button>
          </>
        ) : (
          <>
            <p className="mb-0 rounded-xl border border-[#6C5636]/70 bg-[#6C5636]/15 p-3 text-sm text-[#F5F3EF]/80">Enter the 8-digit code sent to <strong className="text-[#B99D73]">{form.email}</strong>.</p>
            <label className="block text-xs font-semibold text-[#F5F3EF]/85" htmlFor="signup-otp">Email verification code
              <input className={`${fieldClass} tracking-[.32em]`} id="signup-otp" name="otp" type="text" inputMode="numeric" autoComplete="one-time-code" value={form.otp} onChange={update} maxLength={8} pattern="[0-9]{8}" required placeholder="00000000" />
            </label>
            <button disabled={busy} type="submit" className="mt-1 h-12 rounded-xl bg-[#B99D73] px-5 text-sm font-bold text-[#090907] transition hover:bg-[#cfb894] disabled:cursor-wait disabled:opacity-60">
              {busy ? "Verifying…" : "Verify email and create account"}
            </button>
            <button disabled={busy} type="button" onClick={() => { setStage("details"); setMessage(""); setError(""); }} className="text-xs font-semibold text-[#B99D73] underline underline-offset-4 disabled:opacity-50">Edit signup details</button>
          </>
        )}
        {message ? <p role="status" className="mb-0 text-xs text-[#B99D73]">{message}</p> : null}
        {error ? <p role="alert" className="mb-0 text-xs text-[#ffb2a8]">{error}</p> : null}
      </form>

      <div className="my-5 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[.16em] text-[#F5F3EF]/40"><span className="h-px flex-1 bg-[#6C5636]/60" />or<span className="h-px flex-1 bg-[#6C5636]/60" /></div>
      <button type="button" disabled={busy} onClick={githubSignup} className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-[#6C5636] bg-[#090907] text-sm font-bold text-[#F5F3EF] transition hover:border-[#B99D73] hover:bg-[#6C5636]/25 disabled:cursor-wait disabled:opacity-60">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4.5 fill-current"><path d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.55.1.76-.24.76-.53v-2.04c-3.1.68-3.76-1.32-3.76-1.32-.5-1.3-1.23-1.65-1.23-1.65-1.01-.69.08-.68.08-.68 1.12.08 1.71 1.15 1.71 1.15.99 1.7 2.6 1.21 3.24.93.1-.72.39-1.21.71-1.49-2.48-.28-5.09-1.24-5.09-5.52 0-1.22.44-2.22 1.15-3-.12-.28-.5-1.42.11-2.96 0 0 .94-.3 3.06 1.15a10.6 10.6 0 0 1 5.57 0c2.12-1.44 3.06-1.15 3.06-1.15.61 1.54.23 2.68.11 2.96.72.78 1.15 1.78 1.15 3 0 4.29-2.62 5.24-5.11 5.51.4.35.76 1.03.76 2.08V22c0 .29.2.64.77.53A11.1 11.1 0 0 0 12 .9Z" /></svg>
        Sign up with GitHub
      </button>
      <p className="mb-0 mt-2 text-center text-[10px] leading-relaxed text-[#F5F3EF]/45">GitHub sign up continues through GitHub’s secure authorization page.</p>
    </>
  );
}

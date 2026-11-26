"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

const fieldClass = "mt-1.6 h-11 w-full rounded-xl border border-[#6C5636] bg-[#090907]/80 px-3.5 text-sm text-[#F5F3EF] outline-none placeholder:text-[#F5F3EF]/35 focus:border-[#B99D73] focus:ring-2 focus:ring-[#B99D73]/20";

export default function Loginform({ redirectTo = "/dashboard/Home" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ email: "", password: "" });

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function login(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });
      if (!result || result.error || !result.ok) {
        setError("Incorrect email or password. If you signed up with GitHub, use the GitHub button instead.");
        setBusy(false);
        return;
      }
      router.replace(redirectTo);
      router.refresh();
    } catch {
      setError("We could not log you in right now. Please try again.");
      setBusy(false);
    }
  }

  async function githubLogin() {
    setError("");
    setBusy(true);
    try {
      await signIn("github", { redirectTo });
    } catch {
      setError("GitHub sign in could not start. Please try again.");
      setBusy(false);
    }
  }

  return (
    <>
      <form onSubmit={login} className="grid gap-3.5" noValidate>
        <label className="block text-xs font-semibold text-[#F5F3EF]/85" htmlFor="login-email">Email address
          <input className={fieldClass} id="login-email" name="email" type="email" autoComplete="email" value={form.email} onChange={update} maxLength={254} required placeholder="you@example.com" />
        </label>
        <label className="block text-xs font-semibold text-[#F5F3EF]/85" htmlFor="login-password">Password
          <input className={fieldClass} id="login-password" name="password" type="password" autoComplete="current-password" value={form.password} onChange={update} maxLength={128} required placeholder="Your password" />
        </label>
        <button disabled={busy} type="submit" className="mt-1 h-12 rounded-xl bg-[#B99D73] px-5 text-sm font-bold text-[#090907] transition hover:bg-[#cfb894] disabled:cursor-wait disabled:opacity-60">
          {busy ? "Logging in…" : "Log in"}
        </button>
        {error ? <p role="alert" className="mb-0 text-xs text-[#ffb2a8]">{error}</p> : null}
      </form>

      <div className="my-5 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[.16em] text-[#F5F3EF]/40"><span className="h-px flex-1 bg-[#6C5636]/60" />or<span className="h-px flex-1 bg-[#6C5636]/60" /></div>
      <button type="button" disabled={busy} onClick={githubLogin} className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-[#6C5636] bg-[#090907] text-sm font-bold text-[#F5F3EF] transition hover:border-[#B99D73] hover:bg-[#6C5636]/25 disabled:cursor-wait disabled:opacity-60">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4.5 fill-current"><path d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.55.1.76-.24.76-.53v-2.04c-3.1.68-3.76-1.32-3.76-1.32-.5-1.3-1.23-1.65-1.23-1.65-1.01-.69.08-.68.08-.68 1.12.08 1.71 1.15 1.71 1.15.99 1.7 2.6 1.21 3.24.93.1-.72.39-1.21.71-1.49-2.48-.28-5.09-1.24-5.09-5.52 0-1.22.44-2.22 1.15-3-.12-.28-.5-1.42.11-2.96 0 0 .94-.3 3.06 1.15a10.6 10.6 0 0 1 5.57 0c2.12-1.44 3.06-1.15 3.06-1.15.61 1.54.23 2.68.11 2.96.72.78 1.15 1.78 1.15 3 0 4.29-2.62 5.24-5.11 5.51.4.35.76 1.03.76 2.08V22c0 .29.2.64.77.53A11.1 11.1 0 0 0 12 .9Z" /></svg>
        Continue with GitHub
      </button>
      <p className="mb-0 mt-2 text-center text-[10px] leading-relaxed text-[#F5F3EF]/45">GitHub login continues through GitHub’s secure authorization page. New to Sahalak? GitHub will create your account.</p>
    </>
  );
}
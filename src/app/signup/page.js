import Image from "next/image";
import Link from "next/link";
import SignupForm from "@/app/components/SignupForm";
import SignupRouteAnimation from "@/app/components/SignupRouteAnimation";

export const metadata = {
  title: "Create your Sahalak account",
  description: "Join Sahalak to discover local businesses and nearby work opportunities.",
};

export default function SignupPage() {
  return (
    <main className="relative isolate flex min-h-svh items-center justify-center overflow-hidden bg-[#090907] px-4 py-8 text-[#F5F3EF] sm:px-7 lg:px-10">
      <Image src="/market.webp" alt="" fill priority quality={82} sizes="100vw" className="-z-20 object-cover object-center" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[#090907]/65" />

      <div className="relative z-10 w-full max-w-5xl">
        <header className="mb-4 flex items-center justify-between px-1 sm:mb-5">
          <Link href="/" className="inline-flex items-center gap-2.5 text-lg font-extrabold tracking-[-.06em] text-[#F5F3EF] no-underline sm:text-xl">
            <span className="grid size-8 place-items-center rounded-[11px_11px_11px_3px] bg-[#B99D73] text-[#090907]">S</span>
            Sahalak
          </Link>
          <Link href="/choose-role/login" className="text-sm font-semibold text-[#F5F3EF] underline decoration-[#B99D73]/60 underline-offset-4 hover:text-[#B99D73]">Already a member? Log in</Link>
        </header>

        <section aria-labelledby="signup-title" className="grid overflow-hidden rounded-[26px] border border-[#B99D73]/35 bg-[#090907]/90 shadow-[0_30px_100px_#000b] backdrop-blur-xl md:grid-cols-[.9fr_1.1fr]">
          <div className="flex min-h-[220px] flex-col justify-between border-b border-[#6C5636]/70 bg-[#090907]/60 p-6 sm:p-8 md:border-b-0 md:border-r md:p-10">
            <div>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[.2em] text-[#B99D73]">A market with more possibility</p>
              <h1 id="signup-title" className="mb-3 max-w-sm text-[clamp(27px,4vw,42px)] font-extrabold leading-[1.02] tracking-[-.06em] text-[#F5F3EF]">Find your place in the market.</h1>
              <p className="mb-0 max-w-sm text-sm leading-relaxed text-[#F5F3EF]/70">Sahalak connects people with neighborhood businesses—for quick shifts, steady work, and everything in between.</p>
            </div>
            <div className="mt-5 h-[115px] w-full max-w-[420px] self-center sm:h-[155px]" aria-label="Animation of a worker following a route to a shop">
              <SignupRouteAnimation />
            </div>
            <p className="mb-0 mt-4 text-xs text-[#B99D73]">One local connection can open a lot of doors.</p>
          </div>

          <div className="p-6 sm:p-8 md:p-10">
            <div className="mb-6">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[.2em] text-[#B99D73]">Create your account</p>
              <h2 className="mb-1 text-2xl font-extrabold tracking-[-.04em] text-[#F5F3EF] sm:text-[30px]">Join the neighborhood.</h2>
              <p className="mb-0 text-sm text-[#F5F3EF]/60">Sign up as a customer. You can activate a worker profile later.</p>
            </div>
            <SignupForm />
          </div>
        </section>
        <p className="mb-0 mt-4 text-center text-[11px] text-[#F5F3EF]/55">By continuing, you agree to Sahalak’s terms and privacy policy.</p>
      </div>
    </main>
  );
}

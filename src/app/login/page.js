import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/app/lib/auth/auth";
import Loginform from "../components/Loginform";
import SignupRouteAnimation from "@/app/components/SignupRouteAnimation";

export const metadata = {
  title: "Log in to Sahalak",
  description: "Log in to Sahalak to manage your business or find nearby work.",
};

function defaultDestination(role) {
  return role === "owner" ? "/owner/setup" : "/dashboard/Home";
}

// Only allow paths on this site, so a crafted link cannot send people elsewhere after login.
function safeCallbackUrl(value) {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  if (/[\\\r\n]/.test(value)) return null;
  if (value.startsWith("/login") || value.startsWith("/choose-role")) return null; // avoid redirect loops
  return value;
}

async function LoginPageWithRole({ searchParams }) {
  const params = await searchParams;
  const accountRole = params?.role === "owner" ? "owner" : "user";
  const destination = safeCallbackUrl(params?.callbackUrl) || defaultDestination(accountRole);

  const session = await auth();
  if (session?.user) redirect(destination);

  return <LoginPageContent accountRole={accountRole} destination={destination} />;
}

function LoginPageContent({ accountRole, destination }) {
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
          <Link href="/choose-role/signup" className="text-sm font-semibold text-[#F5F3EF] underline decoration-[#B99D73]/60 underline-offset-4 hover:text-[#B99D73]">New here? Sign up</Link>
        </header>

        <section aria-labelledby="login-title" className="grid overflow-hidden rounded-[26px] border border-[#B99D73]/35 bg-[#090907]/90 shadow-[0_30px_100px_#000b] backdrop-blur-xl md:grid-cols-[.9fr_1.1fr]">
          <div className="flex min-h-55 flex-col justify-between border-b border-[#6C5636]/70 bg-[#090907]/60 p-6 sm:p-8 md:border-b-0 md:border-r md:p-10">
            <div>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[.2em] text-[#B99D73]">Good to see you again</p>
              <h1 id="login-title" className="mb-3 max-w-sm text-[clamp(27px,4vw,42px)] font-extrabold leading-[1.02] tracking-[-.06em] text-[#F5F3EF]">Your market is waiting.</h1>
              <p className="mb-0 max-w-sm text-sm leading-relaxed text-[#F5F3EF]/70">Pick up where you left off: find trusted help for a shift, or your next nearby opportunity.</p>
            </div>
            <div className="mt-5 h-28.75-full max-w-105 self-center sm:h-38.75" aria-label="Animation of a worker following a route to a shop">
              <SignupRouteAnimation />
            </div>
            <p className="mb-0 mt-4 text-xs text-[#B99D73]">One local connection can open a lot of doors.</p>
          </div>

          <div className="p-6 sm:p-8 md:p-10">
            <div className="mb-6">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[.2em] text-[#B99D73]">Log in</p>
              <h2 className="mb-1 text-2xl font-extrabold tracking-[-.04em] text-[#F5F3EF] sm:text-[30px]">{accountRole === "owner" ? "Welcome back, business owner." : "Welcome back."}</h2>
              <p className="mb-0 text-sm text-[#F5F3EF]/60">{accountRole === "owner" ? "Log in to manage your shop and find help for busy days." : "Log in to explore local shops and nearby work."}</p>
            </div>
            <Loginform redirectTo={destination} />
          </div>
        </section>
        <p className="mb-0 mt-4 text-center text-[11px] text-[#F5F3EF]/55">By continuing, you agree to Sahalak’s terms and privacy policy.</p>
      </div>
    </main>
  );
}

export default function LoginPage({ searchParams }) {
  return (
    <Suspense fallback={<LoginPageContent accountRole="user" destination="/dashboard/Home" />}>
      <LoginPageWithRole searchParams={searchParams} />
    </Suspense>
  );
}
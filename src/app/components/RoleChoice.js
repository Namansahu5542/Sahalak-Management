// Server component: no "use client" needed. Only <RouteAnimation /> ships JS.
import Image from "next/image";
import Link from "next/link";
import RouteAnimation from "./RouteAnimation";

const ACCENTS = {
  pink: {
    text: "text-[#FF2DAB]",
    card: "border-[#FF2DAB]/30 hover:border-[#FF2DAB]",
    icon: "bg-[#FF2DAB]/10 text-[#FF2DAB]",
    arrow: "border-[#FF2DAB]/40 text-[#FF2DAB]",
  },
  lime: {
    text: "text-[#FF2DAB]",
    card: "border-[#FF2DAB]/30 hover:border-[#FF2DAB]",
    icon: "bg-[#FF2DAB]/10 text-[#FF2DAB]",
    arrow: "border-[#FF2DAB]/40 text-[#FF2DAB]",
  },
};

const ROLES = [
  {
    id: "owner",
    eyebrow: "I run a business",
    title: "Business owner",
    description: "Hire trusted people for one shift, a busy season, or a longer role.",
    accent: "pink",
    icon: "▦",
  },
  {
    id: "user",
    eyebrow: "I’m here to explore",
    title: "Customer or worker",
    description: "Discover local businesses as a customer. Activate a worker profile whenever you’re ready.",
    accent: "lime",
    icon: "↗",
  },
];

const heading = "font-[Manrope,sans-serif] font-extrabold tracking-[-.06em] text-[#F5F3EF]";

export default function RoleChoice({ mode = "signup" }) {
  const isLogin = mode === "login";
  const otherMode = isLogin ? "signup" : "login";

  return (
    <main className="relative isolate min-h-svh overflow-hidden bg-[#0B0B0B] px-4 text-[#F5F3EF] sm:px-7 lg:px-12">
      <Image src="/lko.webp" alt="" fill priority quality={75} sizes="100vw" className="-z-20 object-cover object-center" />
      {/* one scrim instead of three layers (no heavy blur element) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_0%_35%,#FF2DAB26,transparent_45%),linear-gradient(90deg,#0B0B0BB3,#0B0B0B80_50%,#0B0B0BA6)]"
      />

      <header className="relative z-10 mx-auto flex h-16 max-w-7xl items-center justify-between sm:h-[76px]">
        <Link href="/" aria-label="Sahalak home" className={`inline-flex items-center gap-2.5 text-xl no-underline ${heading}`}>
          <span className="grid size-8 place-items-center rounded-[11px_11px_11px_3px] bg-[#FF2DAB] text-base text-[#0B0B0B]">S</span>
          Sahalak
        </Link>
        <span className="rounded-full border border-white/20 bg-black/25 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.14em] text-white/75 sm:text-xs">
          Step 1 <span className="px-1 text-[#FF2DAB]">/</span> Choose your path
        </span>
      </header>

      <section
        aria-labelledby="role-title"
        className="relative z-10 mx-auto flex min-h-[calc(100svh-64px)] max-w-[900px] items-center py-4 sm:min-h-[calc(100svh-76px)]"
      >
        {/* compact + transparent glass box */}
        <div className="grid w-full overflow-hidden rounded-3xl border border-white/20 bg-white/[0.04] shadow-[0_16px_60px_#0008] backdrop-blur-[6px] md:grid-cols-[1fr_1fr]">
          {/* left: story + animation */}
          <div className="flex flex-col justify-center gap-10 border-b border-white/10 p-5 md:border-b-0 md:border-r md:p-6">
            <div className="flex flex-col justify-between gap-10">
              <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.17em] text-[#D4FF3F]">
                <i className="h-px w-5 bg-[#FF2DAB]" />
                Your market, connected
              </span>
              <p className={`mb-0 mt-2.5 text-[clamp(22px,3.4vw,30px)] leading-[1.05] ${heading}`}>
                Every good journey starts with a connection.
              </p>
              <p className="mb-0 mt-2 max-w-[320px] text-xs leading-relaxed text-white/65">
                Follow the route to the right place—whether you’re finding help or your next opportunity.
              </p>
            </div>

            <div className="mx-auto hidden h-[150px] w-full max-w-[360px] sm:block">
              <RouteAnimation />
            </div>
          </div>

          {/* right: role choice */}
          <div className="flex flex-col justify-center p-5 md:p-6">
            <span className="text-[10px] font-bold uppercase tracking-[.17em] text-[#FF2DAB]">Choose your account type</span>
            <h1 id="role-title" className={`mb-0 mt-1.5 text-[clamp(24px,3.6vw,32px)] leading-[1.05] ${heading}`}>
              What Brings You To Sahalak?
            </h1>
            <p className="mb-0 mt-1.5 text-xs text-white/60">
              Select a role to continue to {isLogin ? "log in" : "create your account"}.
            </p>

            <div className="mt-4 grid gap-2.5">
              {ROLES.map((role) => {
                const a = ACCENTS[role.accent];
                return (
                  <Link
                    key={role.id}
                    href={`/${mode}?role=${role.id}`}
                    className={`group flex items-center gap-3 rounded-2xl border bg-white/[0.04] p-3.5 no-underline transition duration-200 hover:-translate-y-0.5 hover:bg-white/[0.08] ${a.card}`}
                  >
                    <span aria-hidden="true" className={`grid size-11 shrink-0 place-items-center rounded-[13px] text-[22px] transition group-hover:scale-105 ${a.icon}`}>
                      {role.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-[9px] font-bold uppercase tracking-[.13em] ${a.text}`}>{role.eyebrow}</span>
                      <span className={`mt-0.5 block text-base leading-tight sm:text-[17px] ${heading}`}>{role.title}</span>
                      <span className="mt-1 block text-[11px] leading-snug text-white/55">{role.description}</span>
                    </span>
                    <span aria-hidden="true" className={`grid size-7 shrink-0 place-items-center rounded-full border text-sm transition group-hover:translate-x-0.5 ${a.arrow}`}>
                      ↗
                    </span>
                  </Link>
                );
              })}
            </div>

            <p className="mb-0 mt-4 text-center text-xs text-white/60">
              {isLogin ? "New to Sahalak?" : "Already have an account?"}{" "}
              <Link href={`/choose-role/${otherMode}`} className="font-bold text-[#D4FF3F] underline-offset-4 hover:underline">
                {isLogin ? "Sign up" : "Log in"}
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
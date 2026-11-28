import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/app/lib/auth/auth";
import { connection } from "next/server";
import { getCategories, getMarkets } from "@/app/lib/markets";
import OwnerSetupForm from "@/app/components/OwnerSetupForm";
import SignupRouteAnimation from "@/app/components/SignupRouteAnimation";

export const metadata = {
  title: "Set up your shop | Sahalak",
  description: "Add your market business details to Sahalak and connect with nearby workers.",
};

export default function OwnerSetupPage() {
  return (
    <main className="min-h-svh bg-[#090907] text-[#F5F3EF]">
      <OwnerSetupHeader />
      <div className="relative isolate min-h-[calc(100svh-72px)] overflow-hidden">
        <Image src="/market.webp" alt="" fill priority quality={72} sizes="100vw" className="-z-20 object-cover object-center opacity-20" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(110deg,#090907f2,#090907de_52%,#090907f2)]" />
        <Suspense fallback={<OwnerSetupFallback />}>
          <OwnerSetupContent />
        </Suspense>
      </div>
    </main>
  );
}

function OwnerSetupHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-[#6C5636]/50 bg-[#090907]/95 backdrop-blur-xl">
      <div className="mx-auto flex min-h-18 max-w-375 items-center justify-between gap-5 px-4 sm:px-7 lg:px-10">
        <Link href="/" aria-label="Sahalak home" className="inline-flex shrink-0 items-center gap-2.5 text-xl font-extrabold tracking-[-.06em] text-[#F5F3EF] no-underline">
          <span className="grid size-9 place-items-center rounded-[12px_12px_12px_4px] bg-[#B99D73] text-[#090907]">S</span>
          Sahalak
        </Link>
        <nav aria-label="Main navigation" className="flex items-center gap-1 sm:gap-3">
          <Link href="/" className="rounded-full px-3 py-2 text-xs font-semibold text-[#F5F3EF]/65 no-underline transition hover:bg-[#6C5636]/25 hover:text-[#B99D73] sm:px-4 sm:text-sm">Home</Link>
          <Link href="/dashboard/Home" className="rounded-full px-3 py-2 text-xs font-semibold text-[#F5F3EF]/65 no-underline transition hover:bg-[#6C5636]/25 hover:text-[#B99D73] sm:px-4 sm:text-sm">Dashboard</Link>
          <Link href="/dashboard/Home#settings" aria-label="Settings" className="grid size-9 place-items-center rounded-full border border-[#6C5636]/70 text-[#B99D73] no-underline transition hover:bg-[#6C5636]/25" title="Settings">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4.5 fill-none stroke-current stroke-[1.7]">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.4 13.5 1.1.9-1.4 2.4-1.3-.5a7.7 7.7 0 0 1-1.5.9l-.2 1.4h-2.8l-.3-1.4a7.7 7.7 0 0 1-1.5-.9l-1.3.5-1.4-2.4 1.1-.9a6.5 6.5 0 0 1 0-1.8l-1.1-.9 1.4-2.4 1.3.5a7.7 7.7 0 0 1 1.5-.9l.3-1.4h2.8l.2 1.4a7.7 7.7 0 0 1 1.5.9l1.3-.5 1.4 2.4-1.1.9a6.5 6.5 0 0 1 0 1.8Z" transform="translate(-1.6 -1.2) scale(1.14)" />
            </svg>
            <span className="sr-only">Settings</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}

function OwnerSetupFallback() {
  return (
    <div className="mx-auto max-w-375 px-4 py-7 sm:px-7 sm:py-10 lg:px-10 lg:py-12" aria-busy="true">
      <p className="mb-3 text-xs font-semibold text-[#B99D73]">Loading your owner setup…</p>
      <div className="mb-6 h-12 w-72 max-w-full animate-pulse rounded-xl bg-[#6C5636]/30" />
      <div className="grid min-h-160 animate-pulse overflow-hidden rounded-[28px] border border-[#B99D73]/25 bg-[#090907]/90 lg:grid-cols-[1.08fr_.92fr]">
        <div className="m-6 rounded-2xl bg-[#6C5636]/15 sm:m-10" />
        <div className="m-6 rounded-2xl bg-[#6C5636]/20 sm:m-10" />
      </div>
    </div>
  );
}

async function OwnerSetupContent() {
  await connection();
  const session = await auth();
  if (!session?.user) redirect("/choose-role/login?callbackUrl=%2Fowner%2Fsetup");
  const [markets, categories] = await Promise.all([
    getMarkets({ includeDraft: true }),
    getCategories(),
  ]);

  return (
    <div className="relative z-10 px-4 py-7 sm:px-7 sm:py-10 lg:px-10 lg:py-12">
      <div className="mx-auto max-w-375">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[.2em] text-[#B99D73]">Owner onboarding · Step 1 of 1</p>
            <h1 className="mb-0 text-3xl font-extrabold tracking-[-.055em] text-[#F5F3EF] sm:text-4xl">Set up your business</h1>
          </div>
          <p className="mb-1 text-xs text-[#F5F3EF]/55">A few details help workers find the right shop.</p>
        </div>

        <section aria-label="Business setup" className="grid min-h-160 overflow-hidden rounded-[28px] border border-[#B99D73]/35 bg-[#090907]/95 shadow-[0_28px_100px_#000b] backdrop-blur-xl lg:grid-cols-[1.08fr_.92fr]">
          <div className="p-5 sm:p-8 lg:p-10 xl:p-12">
            <div className="mb-7 max-w-2xl">
              <span className="mb-2 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#B99D73]"><i className="h-px w-5 bg-[#6C5636]" />Your shop profile</span>
              <h2 className="mb-1 text-xl font-bold tracking-[-.035em] text-[#F5F3EF] sm:text-2xl">Tell us about your shop</h2>
              <p className="mb-0 text-sm text-[#F5F3EF]/55">This information helps nearby people recognize your business and reach you.</p>
            </div>
            <OwnerSetupForm markets={markets} categories={categories} />
          </div>

          <aside className="relative flex flex-col justify-between overflow-hidden border-t border-[#6C5636]/70 bg-[#6C5636]/10 p-5 sm:p-8 lg:border-l lg:border-t-0 lg:p-10 xl:p-12">
            <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-[#B99D73]/10 blur-3xl" />
            <div className="relative z-10">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[.2em] text-[#B99D73]">Made for local business</p>
              <h2 className="mb-3 max-w-md text-3xl font-extrabold leading-[1.04] tracking-[-.055em] text-[#F5F3EF] sm:text-4xl">The right people, closer to your shop.</h2>
              <p className="mb-0 max-w-lg text-sm leading-relaxed text-[#F5F3EF]/65">Create a clear business profile so workers can recognize your location, understand what you do, and find you when you need an extra pair of hands.</p>
            </div>

            <div className="relative mx-auto my-6 h-45 w-full max-w-155 sm:h-55">
              <SignupRouteAnimation />
            </div>

            <div className="relative z-10 rounded-2xl border border-[#B99D73]/25 bg-[#090907]/75 p-5 shadow-[0_14px_45px_#0005] sm:p-6">
              <div className="mb-3 flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-[#6C5636]/35 text-[#B99D73]" aria-hidden="true">✦</span>
                <div>
                  <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[.16em] text-[#B99D73]">Your shop details</p>
                  <h3 className="mb-0 text-base font-bold text-[#F5F3EF]">One profile, easier connections</h3>
                </div>
              </div>
              <p className="mb-0 text-sm leading-relaxed text-[#F5F3EF]/65">Your market, address, category, contact number, and photo help people identify your shop. You can update these details as your business changes.</p>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}

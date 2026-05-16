import { SignInButton, SignUpButton } from "@clerk/clerk-react";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-20">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/40 px-3 py-1 text-xs text-slate-300">
            Private by default. No public profiles. No discovery.
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight">
            SquadCode
          </h1>
          <p className="mt-3 text-slate-300 leading-relaxed">
            A private squad platform for competitive programmers. Connect your
            accounts, verify ownership, and share a real dashboard + contest
            threads — visible only to people you invite.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <SignUpButton mode="modal">
              <button className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400">
                Create account
              </button>
            </SignUpButton>
            <SignInButton mode="modal">
              <button className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-900">
                Sign in
              </button>
            </SignInButton>
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <Feature
              title="Private squads"
              desc="Everything is scoped to your squad. No public endpoints for browsing."
            />
            <Feature
              title="Verified connections"
              desc="Prove ownership with a short token placed in your profile."
            />
            <Feature
              title="Shared dashboard"
              desc="Compare rating, solved counts, and activity side-by-side."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-slate-900 bg-slate-900/20 p-4">
      <div className="font-semibold">{title}</div>
      <div className="mt-1 text-slate-300">{desc}</div>
    </div>
  );
}


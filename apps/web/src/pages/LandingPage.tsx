import { SignInButton, SignUpButton } from "../auth";
import { usePageTitle } from "../lib/usePageTitle";

export function LandingPage() {
  usePageTitle("SquadCode | Private Competitive Programming Dashboard");

  return (
    <div className="min-h-screen overflow-hidden text-ink-800">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="SquadCode Logo" className="h-11 w-11 rounded-2xl object-cover border-2 border-ink-900 shadow-pop" />
          <div>
            <div className="font-display font-bold text-ink-900">SquadCode</div>
            <div className="text-xs text-ink-400">Private CP squad hub</div>
          </div>
        </div>
        <SignInButton mode="modal">
          <button className="rounded-xl border-2 border-ink-900 bg-surface-0 px-4 py-2 text-sm font-bold text-ink-800 shadow-pop transition active:translate-y-1 active:shadow-none hover:bg-ink-100">
            Sign in
          </button>
        </SignInButton>
      </header>

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pt-16">
        <section>
          <div className="inline-flex items-center gap-2 rounded-full border-2 border-ink-900 bg-mint-300/60 px-3 py-1 text-xs font-bold text-ink-800 shadow-pop-sm">
            <span className="h-2 w-2 rounded-full bg-mint-500" />
            Invite-only dashboards for serious practice squads
          </div>
          <h1 className="font-display mt-6 max-w-3xl text-5xl font-extrabold tracking-tight text-ink-900 sm:text-6xl">
            Train, verify, discuss, and{" "}
            <span className="text-gradient-brand">ship better</span> contest prep together.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-ink-600 sm:text-lg">
            SquadCode gives competitive programmers a private workspace for
            verified Codeforces, LeetCode, and GitHub profiles, shared problem
            sheets, live activity, and contest threads visible only to invited
            teammates.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <SignUpButton mode="modal">
              <button className="rounded-xl border-2 border-ink-900 bg-brand-500 px-5 py-3 text-sm font-extrabold text-white shadow-pop transition active:translate-y-1 active:shadow-none hover:bg-brand-400">
                Create your squad
              </button>
            </SignUpButton>
            <SignInButton mode="modal">
              <button className="rounded-xl border-2 border-ink-900 bg-surface-0 px-5 py-3 text-sm font-bold text-ink-800 shadow-pop transition active:translate-y-1 active:shadow-none hover:bg-ink-100">
                Open dashboard
              </button>
            </SignInButton>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
            <Feature
              color="bg-brand-100"
              title="Private squads"
              desc="Every dashboard, thread, and sheet stays scoped to your invited team."
            />
            <Feature
              color="bg-mint-300/40"
              title="Verified connections"
              desc="Connect real CP profiles before stats appear on the shared board."
            />
            <Feature
              color="bg-sun-300/40"
              title="Focused practice"
              desc="Track sheets, contest conversations, and team activity in one place."
            />
          </div>
        </section>

        <section className="relative">
          <div className="absolute -right-6 -top-6 h-20 w-20 rounded-2xl border-2 border-ink-900 bg-sun-400 shadow-pop rotate-12" />
          <div className="absolute -left-6 bottom-12 h-16 w-16 rounded-full border-2 border-ink-900 bg-coral-300 shadow-pop" />
          <div className="relative overflow-hidden rounded-3xl border-2 border-ink-900 bg-surface-0 p-5 shadow-[0_8px_0_0_#cfc8f0]">
            <div className="flex items-center justify-between border-b-2 border-border pb-4">
              <div>
                <div className="font-display text-sm font-bold text-ink-900">Apex Coders</div>
                <div className="mt-1 text-xs text-ink-400">Live squad dashboard</div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink-900 bg-mint-300/60 px-3 py-1 text-xs font-bold text-ink-800">
                <span className="h-2 w-2 animate-pulse rounded-full bg-mint-500" />
                Live
              </span>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <Metric label="CF rating" value="1842" color="bg-brand-100" />
              <Metric label="LC solved" value="621" color="bg-sun-300/40" />
              <Metric label="GH contrib" value="1,284" color="bg-mint-300/40" />
            </div>
            <div className="mt-5 space-y-3">
              {[
                ["piyush_icpc", "solved D. Array Division", "bg-brand-500"],
                ["neha_dp", "created Codeforces Round thread", "bg-coral-500"],
                ["arjun_dev", "completed 8 sheet problems", "bg-mint-500"]
              ].map(([name, event, color]) => (
                <div
                  key={name}
                  className="flex items-center gap-3 rounded-2xl border-2 border-border bg-surface-2 p-4 transition hover:border-ink-900"
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border-2 border-ink-900 text-sm font-extrabold  ${color}`}
                  >
                    {name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-ink-900">{name}</div>
                    <div className="text-xs text-ink-400">{event}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function Feature({ title, desc, color }: { title: string; desc: string; color: string }) {
  return (
    <div className={`rounded-2xl border-2 border-ink-900 ${color} p-4 shadow-pop`}>
      <div className="font-display font-bold text-ink-900">{title}</div>
      <div className="mt-1 text-ink-600">{desc}</div>
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`rounded-2xl border-2 border-ink-900 ${color} p-4`}>
      <div className="text-xs font-bold text-ink-600">{label}</div>
      <div className="font-display mt-2 text-2xl font-extrabold text-ink-900">{value}</div>
    </div>
  );
}

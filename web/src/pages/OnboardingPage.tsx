import { useMemo, useState, useEffect } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { createApiClient } from "../lib/api";
import { useSquadStore } from "../store/squadStore";
import { usePageTitle } from "../lib/usePageTitle";

type MySquad = { id: string; name: string; role: "admin" | "member"; inviteCode?: string };

const STEPS = ["Your Profile", "Squad", "Connections"];

export function OnboardingPage() {
  usePageTitle("Squad Setup | SquadCode");

  const navigate = useNavigate();
  const { user } = useUser();
  const { getToken } = useAuth();
  const setSelectedSquadId = useSquadStore((s) => s.setSelectedSquadId);


  const api = useMemo(() => createApiClient(() => getToken()), [getToken]);

  const [step, setStep] = useState(0);
  const [username, setUsername] = useState(user?.username ?? "");
  const email = user?.primaryEmailAddress?.emailAddress ?? "";

  const [status, setStatus] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [squadName, setSquadName] = useState("");
  const location = new URLSearchParams(window.location.search);
  const [inviteCode, setInviteCode] = useState(location.get("inviteCode") || "");
  const [mySquads, setMySquads] = useState<MySquad[]>([]);
  const [createdSquad, setCreatedSquad] = useState<{ id: string; name: string; inviteCode: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get("/squads/mine").then((res) => {
      const squads = (res.data?.squads ?? []) as MySquad[];
      setMySquads(squads);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function syncMe() {
    setStatus(null);
    if (!username.trim()) throw new Error("Username required");
    if (!email) throw new Error("Email missing in Clerk profile");
    await api.post("/auth/sync", { username: username.trim(), email });
  }

  async function onCreateSquad() {
    setCreating(true);
    setStatus(null);
    try {
      await syncMe();
      const res = await api.post("/squads", { name: squadName.trim() });
      const squad = res.data.squad as { id: string; name: string; inviteCode: string };
      setSelectedSquadId(squad.id);
      setCreatedSquad(squad);
      setStep(2);
    } catch (e: unknown) {
      setStatus(errorMessage(e));
    } finally {
      setCreating(false);
    }
  }

  async function onJoinSquad() {
    setJoining(true);
    setStatus(null);
    try {
      await syncMe();
      const res = await api.post(`/squads/join/${inviteCode.trim()}`);
      setSelectedSquadId(res.data.squadId);
      setStep(2);
    } catch (e: unknown) {
      setStatus(errorMessage(e));
    } finally {
      setJoining(false);
    }
  }

  function copyCode(code: string) {
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Step indicator */}
      <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card p-6">
        <h1 className="font-display text-lg font-bold">Squad setup</h1>
        <div className="mt-4 flex items-center gap-0">
          {STEPS.map((label, i) => (
            <div key={i} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-extrabold transition-all ${
                  i < step
                    ? "border-brand-500 bg-brand-500 text-white"
                    : i === step
                      ? "border-ink-900 bg-ink-900 text-surface-0"
                      : "border-border bg-surface-2 text-ink-400"
                }`}>
                  {i < step ? (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <div className={`mt-1 text-[11px] font-bold ${i === step ? "text-ink-900" : "text-ink-400"}`}>
                  {label}
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`mb-5 mx-1 flex-1 h-0.5 transition-all ${i < step ? "bg-brand-500" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 0: Profile */}
      {step === 0 && (
        <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card p-6">
          <div className="text-sm font-bold">Your SquadCode username</div>
          <p className="mt-1 text-sm text-ink-600">This is how teammates will see you on the leaderboard.</p>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="text-sm">
              <div className="text-ink-600">Username</div>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 w-full rounded-xl border-2 border-ink-900 bg-surface-0 px-3 py-2 text-ink-800 outline-none transition focus:ring-2 focus:ring-brand-500/40"
                placeholder="e.g. piyush_icpc"
              />
            </label>
            <label className="text-sm">
              <div className="text-ink-600">Email (from Clerk)</div>
              <input
                value={email}
                disabled
                className="mt-1 w-full rounded-xl border border-border-subtle bg-black/10 px-3 py-2 text-ink-400"
              />
            </label>
          </div>
          {status && <div className="mt-3 text-sm text-coral-500 font-bold">{status}</div>}
          <button
            disabled={!username.trim() || !email}
            onClick={() => setStep(1)}
            className="mt-4 rounded-xl border-2 border-ink-900 bg-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-pop transition active:translate-y-1 active:shadow-none hover:bg-brand-400 disabled:opacity-50"
          >
            Continue →
          </button>
        </div>
      )}

      {/* Step 1: Squad */}
      {step === 1 && (
        <>
          {mySquads.length > 0 && (
            <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card p-5">
              <div className="text-sm font-bold">Your existing squads</div>
              <div className="mt-3 space-y-2">
                {mySquads.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setSelectedSquadId(s.id); navigate("/dashboard"); }}
                    className="flex w-full items-center justify-between rounded-xl border-2 border-border bg-surface-2 p-3 text-left transition hover:border-ink-900 hover:bg-surface-0"
                  >
                    <div>
                      <div className="text-sm font-bold">{s.name}</div>
                      <div className="text-xs text-ink-400 capitalize">{s.role}</div>
                    </div>
                    <span className="text-xs font-bold text-brand-500">Go to dashboard →</span>
                  </button>
                ))}
              </div>
              <div className="mt-4 border-t border-border pt-4 text-sm text-ink-600">Or create / join a new one below:</div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card p-6">
              <div className="text-sm font-bold">Create a new squad</div>
              <p className="mt-2 text-sm text-ink-600">You become admin and get an invite code.</p>
              <input
                value={squadName}
                onChange={(e) => setSquadName(e.target.value)}
                className="mt-4 w-full rounded-xl border-2 border-ink-900 bg-surface-0 px-3 py-2 text-ink-800 outline-none transition focus:ring-2 focus:ring-brand-500/40"
                placeholder="Squad name (e.g. ICPC Team)"
              />
              {status && <div className="mt-2 text-sm text-coral-500 font-bold">{status}</div>}
              <button
                disabled={creating || !squadName.trim()}
                onClick={onCreateSquad}
                className="mt-4 w-full rounded-xl border-2 border-ink-900 bg-brand-500 px-4 py-2 text-sm font-bold text-white shadow-pop transition active:translate-y-1 active:shadow-none hover:bg-brand-400 disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create squad"}
              </button>
            </div>

            <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card p-6">
              <div className="text-sm font-bold">Join via invite code</div>
              <p className="mt-2 text-sm text-ink-600">Ask a squad admin for the 8-character code.</p>
              <input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="mt-4 w-full rounded-xl border-2 border-ink-900 bg-surface-0 px-3 py-2 font-mono text-ink-800 tracking-widest outline-none transition focus:ring-2 focus:ring-brand-500/40"
                placeholder="ABCD1234"
                maxLength={8}
              />
              <button
                disabled={joining || !inviteCode.trim()}
                onClick={onJoinSquad}
                className="mt-4 w-full rounded-xl border-2 border-border-strong bg-surface-2 px-4 py-2 text-sm font-bold text-ink-800 hover:bg-surface-0 disabled:opacity-50 transition"
              >
                {joining ? "Joining..." : "Join squad"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Step 2: Connections */}
      {step === 2 && (
        <div className="space-y-5">
          {createdSquad && (
            <div className="rounded-2xl border-2 border-mint-500 bg-mint-300/20 p-5">
              <div className="flex items-center gap-2 text-sm font-bold text-ink-900">
                <svg className="h-5 w-5 text-mint-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Squad "{createdSquad.name}" created!
              </div>
              <p className="mt-1 text-sm text-ink-600">Share this invite code with teammates:</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 rounded-xl border-2 border-ink-900 bg-surface-0 px-4 py-2 font-mono text-xl font-extrabold tracking-[0.25em] text-ink-900">
                  {createdSquad.inviteCode}
                </div>
                <button
                  onClick={() => copyCode(createdSquad.inviteCode)}
                  className="rounded-xl border-2 border-ink-900 bg-brand-500 px-4 py-2 text-sm font-bold text-white shadow-pop transition hover:bg-brand-400"
                >
                  {copied ? "✓ Copied!" : "Copy"}
                </button>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 rounded-xl border-2 border-ink-900 bg-surface-0 px-4 py-2 font-mono text-sm font-extrabold text-ink-900 overflow-hidden text-ellipsis whitespace-nowrap">
                  {`${window.location.origin}/join/${createdSquad.inviteCode}`}
                </div>
                <button
                  onClick={() => copyCode(`${window.location.origin}/join/${createdSquad.inviteCode}`)}
                  className="rounded-xl border-2 border-ink-900 bg-surface-2 px-4 py-2 text-sm font-bold text-ink-900 shadow-pop transition hover:bg-surface-0"
                >
                  {copied ? "✓ Copied!" : "Copy Link"}
                </button>
              </div>
            </div>
          )}
          <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card p-6">
            <div className="text-sm font-bold">🔗 Connect your platforms</div>
            <p className="mt-2 text-sm text-ink-600">
              Connect Codeforces, LeetCode, and GitHub so your stats show on the squad dashboard. You can skip this and do it later from <strong>Connections</strong>.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={() => navigate("/settings/connections")}
                className="rounded-xl border-2 border-ink-900 bg-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-pop transition hover:bg-brand-400"
              >
                Connect now →
              </button>
              <button
                onClick={() => navigate("/dashboard")}
                className="rounded-xl border-2 border-border-strong bg-surface-2 px-5 py-2.5 text-sm font-bold text-ink-700 transition hover:bg-surface-0"
              >
                Go to dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function errorMessage(e: unknown) {
  if (axios.isAxiosError(e)) {
    const data = e.response?.data as { error?: string } | undefined;
    return data?.error ?? e.message ?? "Request failed";
  }
  if (e instanceof Error) return e.message;
  return "Something went wrong";
}

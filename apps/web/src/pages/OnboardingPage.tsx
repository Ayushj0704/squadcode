import { useMemo, useState } from "react";
import { useAuth, useUser } from "../auth";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { createApiClient } from "../lib/api";
import { useSquadStore } from "../store/squadStore";
import { usePageTitle } from "../lib/usePageTitle";

export function OnboardingPage() {
  usePageTitle("Squad Setup | SquadCode");

  const navigate = useNavigate();
  const { user } = useUser();
  const { getToken } = useAuth();
  const setSelectedSquadId = useSquadStore((s) => s.setSelectedSquadId);

  const api = useMemo(() => createApiClient(() => getToken()), [getToken]);

  const [username, setUsername] = useState(user?.username ?? "");
  const email = user?.email ?? "";

  const [status, setStatus] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [squadName, setSquadName] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  async function syncMe() {
    setStatus(null);
    if (!username.trim()) throw new Error("Username required");
    if (username.trim().length < 3) throw new Error("Username must be at least 3 characters");
    if (!email) throw new Error("Email missing in Clerk profile");
    await api.post("/auth/sync", { username: username.trim(), email });
  }

  async function onCreateSquad() {
    setCreating(true);
    setStatus(null);
    try {
      await syncMe();
      const res = await api.post("/squads", { name: squadName.trim() });
      setSelectedSquadId(res.data.squad.id);
      navigate(`/dashboard`);
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
      navigate(`/dashboard`);
    } catch (e: unknown) {
      setStatus(errorMessage(e));
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card p-6">
        <h1 className="font-display text-lg font-bold">Squad setup</h1>
        <p className="mt-2 text-sm text-ink-600">
          Pick a username, then create or join a private squad. No discovery -
          only invite codes.
        </p>
      </div>

      <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card p-6">
        <div className="text-sm font-bold">Your SquadCode username</div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div className="text-ink-600">Email</div>
            <input
              value={email}
              disabled
              className="mt-1 w-full rounded-xl border border-border-subtle bg-black/20 px-3 py-2 text-ink-400"
            />
          </label>
        </div>
        {status ? (
          <div className="mt-3 text-sm text-coral-500 font-bold">{status}</div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card p-6">
          <div className="text-sm font-bold">Create a new squad</div>
          <p className="mt-2 text-sm text-ink-600">
            You become admin and get an invite code.
          </p>
          <input
            value={squadName}
            onChange={(e) => setSquadName(e.target.value)}
            className="mt-4 w-full rounded-xl border-2 border-ink-900 bg-surface-0 px-3 py-2 text-ink-800 outline-none transition focus:ring-2 focus:ring-brand-500/40"
            placeholder="Squad name"
          />
          <button
            disabled={creating || !squadName.trim() || !username.trim()}
            onClick={onCreateSquad}
            className="mt-4 w-full rounded-xl border-2 border-ink-900 bg-brand-500 px-4 py-2 text-sm font-bold text-white shadow-pop transition active:translate-y-1 active:shadow-none hover:bg-brand-400 disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create squad"}
          </button>
        </div>

        <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card p-6">
          <div className="text-sm font-bold">Join via invite code</div>
          <p className="mt-2 text-sm text-ink-600">
            Ask a squad admin for the code.
          </p>
          <input
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            className="mt-4 w-full rounded-xl border-2 border-ink-900 bg-surface-0 px-3 py-2 text-ink-800 outline-none transition focus:ring-2 focus:ring-brand-500/40"
            placeholder="Invite code"
          />
          <button
            disabled={joining || !inviteCode.trim() || !username.trim()}
            onClick={onJoinSquad}
            className="mt-4 w-full rounded-xl border border-border-strong bg-surface-2 px-4 py-2 text-sm font-bold text-ink-800 hover:bg-surface-raised disabled:opacity-50"
          >
            {joining ? "Joining..." : "Join squad"}
          </button>
        </div>
      </div>
    </div>
  );
}

function errorMessage(e: unknown) {
  if (axios.isAxiosError(e)) {
    const data = e.response?.data as { error?: string; details?: { message: string }[] } | undefined;
    if (data?.details && Array.isArray(data.details) && data.details.length > 0) {
      return data.details.map(d => d.message).join(", ");
    }
    return data?.error ?? e.message ?? "Request failed";
  }
  if (e instanceof Error) return e.message;
  return "Something went wrong";
}

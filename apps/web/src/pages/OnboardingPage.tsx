import { useMemo, useState } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { createApiClient } from "../lib/api";
import { useSquadStore } from "../store/squadStore";

export function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { getToken } = useAuth();
  const setActiveSquadId = useSquadStore((s) => s.setActiveSquadId);

  const api = useMemo(() => createApiClient(() => getToken()), [getToken]);

  const [username, setUsername] = useState(user?.username ?? "");
  const email = user?.primaryEmailAddress?.emailAddress ?? "";

  const [status, setStatus] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [squadName, setSquadName] = useState("");
  const [inviteCode, setInviteCode] = useState("");

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
      setActiveSquadId(res.data.squad.id);
      navigate(`/squad/${res.data.squad.id}`);
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
      setActiveSquadId(res.data.squadId);
      navigate(`/squad/${res.data.squadId}`);
    } catch (e: unknown) {
      setStatus(errorMessage(e));
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="rounded-2xl border border-slate-900 bg-slate-900/20 p-6">
        <h1 className="text-lg font-semibold">Onboarding</h1>
        <p className="mt-2 text-sm text-slate-300">
          Pick a username, then create or join a private squad. No discovery —
          only invite codes.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-900 bg-slate-900/20 p-6">
        <div className="text-sm font-semibold">Your SquadCode username</div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="text-sm">
            <div className="text-slate-300">Username</div>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-indigo-500"
              placeholder="e.g. piyush_icpc"
            />
          </label>
          <label className="text-sm">
            <div className="text-slate-300">Email</div>
            <input
              value={email}
              disabled
              className="mt-1 w-full rounded-xl border border-slate-900 bg-slate-950/40 px-3 py-2 text-slate-400"
            />
          </label>
        </div>
        {status ? (
          <div className="mt-3 text-sm text-rose-300">{status}</div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-900 bg-slate-900/20 p-6">
          <div className="text-sm font-semibold">Create a new squad</div>
          <p className="mt-2 text-sm text-slate-300">
            You become admin and get an invite code.
          </p>
          <input
            value={squadName}
            onChange={(e) => setSquadName(e.target.value)}
            className="mt-4 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-indigo-500"
            placeholder="Squad name"
          />
          <button
            disabled={creating || !squadName.trim() || !username.trim()}
            onClick={onCreateSquad}
            className="mt-4 w-full rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create squad"}
          </button>
        </div>

        <div className="rounded-2xl border border-slate-900 bg-slate-900/20 p-6">
          <div className="text-sm font-semibold">Join via invite code</div>
          <p className="mt-2 text-sm text-slate-300">
            Ask a squad admin for the code.
          </p>
          <input
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            className="mt-4 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-indigo-500"
            placeholder="Invite code"
          />
          <button
            disabled={joining || !inviteCode.trim() || !username.trim()}
            onClick={onJoinSquad}
            className="mt-4 w-full rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-900 disabled:opacity-50"
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
    const data = e.response?.data as { error?: string } | undefined;
    return data?.error ?? e.message ?? "Request failed";
  }
  if (e instanceof Error) return e.message;
  return "Something went wrong";
}

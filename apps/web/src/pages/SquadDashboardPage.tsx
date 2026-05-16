import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import { createApiClient, type SquadMember } from "../lib/api";
import { useSquadStore } from "../store/squadStore";

export function SquadDashboardPage() {
  const { id } = useParams();
  const { getToken } = useAuth();
  const api = useMemo(() => createApiClient(() => getToken()), [getToken]);

  const setActiveSquadId = useSquadStore((s) => s.setActiveSquadId);
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let alive = true;
    async function run() {
      setError(null);
      setDashboard(null);
      try {
        const res = await api.get(`/squads/${id}/dashboard`);
        if (!alive) return;
        setDashboard(res.data);
        setActiveSquadId(id ?? null);
        // Fire-and-forget refresh on open (backend may queue it).
        void api.post(`/data/refresh/${id}`).catch(() => {});
      } catch (e: unknown) {
        if (!alive) return;
        setError(errorMessage(e));
      }
    }
    if (id) run();
    return () => {
      alive = false;
    };
  }, [api, id, setActiveSquadId]);

  if (error) {
    return (
      <div className="rounded-2xl border border-slate-900 bg-slate-900/20 p-6 text-rose-300">
        {error}
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="rounded-2xl border border-slate-900 bg-slate-900/20 p-6 text-slate-300">
        Loading squad...
      </div>
    );
  }

  async function triggerRefresh() {
    if (!id) return;
    setRefreshing(true);
    try {
      await api.post(`/data/refresh/${id}`);
    } catch (e: unknown) {
      setError(errorMessage(e));
    } finally {
      setRefreshing(false);
    }
  }

  const squadName = dashboard.squad?.name ?? "Squad";

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="rounded-2xl border border-slate-900 bg-slate-900/20 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold">{squadName}</h1>
            <p className="mt-1 text-sm text-slate-300">
              Invite code:{" "}
              <span className="font-mono text-slate-100">
                {dashboard.squad?.inviteCode ?? "—"}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-slate-300">
              Members:{" "}
              <span className="text-slate-100">{dashboard.members.length}</span>
            </div>
            <button
              onClick={triggerRefresh}
              disabled={refreshing}
              className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-900 disabled:opacity-50"
            >
              {refreshing ? "Refreshing..." : "Refresh data"}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-900 bg-slate-900/20 p-6">
        <div className="text-sm font-semibold">Members</div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {dashboard.members.map((m) => (
            <MemberCard
              key={m.id}
              member={m}
              connections={dashboard.connections}
              caches={dashboard.caches}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

type Connection = {
  userId: string;
  platform: "codeforces" | "leetcode" | "github";
  username: string;
  verified: boolean;
};

type Cache = {
  userId: string;
  platform: "codeforces" | "leetcode" | "github";
  data: unknown;
  fetchedAt: string;
};

type DashboardPayload = {
  squadId: string;
  squad?: { id: string; name: string; inviteCode: string };
  members: SquadMember[];
  connections: Connection[];
  caches: Cache[];
};

function MemberCard(props: {
  member: SquadMember;
  connections: Connection[];
  caches: Cache[];
}) {
  const conns = props.connections.filter((c) => c.userId === props.member.user.id);
  const caches = props.caches.filter((c) => c.userId === props.member.user.id);

  const cf = asObject(caches.find((c) => c.platform === "codeforces")?.data);
  const lc = asObject(caches.find((c) => c.platform === "leetcode")?.data);
  const gh = asObject(caches.find((c) => c.platform === "github")?.data);

  const cfConn = conns.find((c) => c.platform === "codeforces");
  const lcConn = conns.find((c) => c.platform === "leetcode");
  const ghConn = conns.find((c) => c.platform === "github");

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
      <div className="flex items-center justify-between">
        <div className="font-semibold">{props.member.user.username}</div>
        <span className="rounded-full border border-slate-800 bg-slate-900/40 px-2 py-0.5 text-xs text-slate-300">
          {props.member.role}
        </span>
      </div>
      <div className="mt-1 text-sm text-slate-400">{props.member.user.email}</div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <Stat
          label="CF rating"
          value={
            typeof cf?.rating === "number"
              ? String(cf.rating)
              : cfConn?.verified
                ? "…"
                : "—"
          }
          sub={cfConn?.verified ? cfConn.username : "not connected"}
        />
        <Stat
          label="LC solved"
          value={
            typeof lc?.totalSolved === "number"
              ? String(lc.totalSolved)
              : lcConn?.verified
                ? "…"
                : "—"
          }
          sub={lcConn?.verified ? lcConn.username : "not connected"}
        />
        <Stat
          label="GH contrib"
          value={
            typeof gh?.totalContributionsThisYear === "number"
              ? String(gh.totalContributionsThisYear)
              : ghConn?.verified
                ? "…"
                : "—"
          }
          sub={ghConn?.verified ? ghConn.username : "not connected"}
        />
      </div>
    </div>
  );
}

function Stat(props: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-slate-900 bg-slate-950/30 p-3">
      <div className="text-slate-400">{props.label}</div>
      <div className="mt-1 text-slate-100 text-sm font-semibold">{props.value}</div>
      <div className="mt-1 text-slate-500 truncate">{props.sub}</div>
    </div>
  );
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function errorMessage(e: unknown) {
  if (axios.isAxiosError(e)) {
    const data = e.response?.data as { error?: string } | undefined;
    return data?.error ?? e.message ?? "Request failed";
  }
  if (e instanceof Error) return e.message;
  return "Something went wrong";
}

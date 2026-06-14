import { useEffect, useMemo, useState } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import axios from "axios";
import { createApiClient, type SquadMember } from "../lib/api";
import { useSquadStore } from "../store/squadStore";
import { usePageTitle } from "../lib/usePageTitle";

type MySquad = {
  id: string;
  name: string;
  description: string | null;
  role: "admin" | "member";
  joinedAt: string;
  createdAt: string;
};

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

type FeedItem = {
  id: string;
  squadId: string;
  userId: string;
  platform: "codeforces" | "leetcode" | "github";
  activityType: "problem_solved" | "rating_changed" | "contest_participated";
  description: string;
  metadata: unknown;
  createdAt: string;
  user: { id: string; username: string; email: string };
};

export function DashboardPage() {
  usePageTitle("Dashboard | SquadCode");

  const { getToken } = useAuth();
  const { user } = useUser();
  const api = useMemo(() => createApiClient(() => getToken()), [getToken]);

  const selectedSquadId = useSquadStore((s) => s.selectedSquadId);
  const setSelectedSquadId = useSquadStore((s) => s.setSelectedSquadId);

  const [mySquads, setMySquads] = useState<MySquad[]>([]);
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [squadAction, setSquadAction] = useState<"leave" | "delete" | null>(null);

  useEffect(() => {
    let alive = true;
    async function loadSquads() {
      setError(null);
      setLoading(true);
      try {
        const res = await api.get("/squads/mine");
        if (!alive) return;
        const squads = (res.data?.squads ?? []) as MySquad[];
        setMySquads(squads);

        const preferred =
          (selectedSquadId && squads.find((s) => s.id === selectedSquadId)?.id) ??
          squads[0]?.id ??
          null;
        if (preferred !== selectedSquadId) setSelectedSquadId(preferred);
      } catch (e: unknown) {
        if (!alive) return;
        setError(errorMessage(e));
        setMySquads([]);
        setSelectedSquadId(null);
      } finally {
        if (alive) setLoading(false);
      }
    }
    void loadSquads();
    return () => {
      alive = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, setSelectedSquadId]);

  useEffect(() => {
    let alive = true;
    async function loadDashboardAndFeed() {
      if (!selectedSquadId) {
        setDashboard(null);
        setFeed([]);
        return;
      }
      setError(null);
      setDashboard(null);
      try {
        const [dashRes, feedRes] = await Promise.all([
          api.get(`/squads/${selectedSquadId}/dashboard`),
          api.get(`/feed/${selectedSquadId}`)
        ]);
        if (!alive) return;
        setDashboard(dashRes.data as DashboardPayload);
        setFeed((feedRes.data?.items ?? []) as FeedItem[]);
        void api.post(`/platformData/refresh/${selectedSquadId}`).catch(() => {});
      } catch (e: unknown) {
        if (!alive) return;
        setError(errorMessage(e));
      }
    }
    void loadDashboardAndFeed();
    return () => {
      alive = false;
    };
  }, [api, selectedSquadId]);

  useEffect(() => {
    if (!selectedSquadId) return;
    const timer = setInterval(() => {
      void api
        .get(`/feed/${selectedSquadId}`)
        .then((res) => setFeed((res.data?.items ?? []) as FeedItem[]))
        .catch(() => {});
    }, 30_000);
    return () => clearInterval(timer);
  }, [api, selectedSquadId]);

  async function triggerRefresh() {
    if (!selectedSquadId) return;
    setRefreshing(true);
    try {
      await api.post(`/platformData/refresh/${selectedSquadId}`);
      const dashRes = await api.get(`/squads/${selectedSquadId}/dashboard`);
      setDashboard(dashRes.data as DashboardPayload);
    } catch (e: unknown) {
      setError(errorMessage(e));
    } finally {
      setRefreshing(false);
    }
  }

  async function removeCurrentSquad(action: "leave" | "delete") {
    if (!selectedSquadId) return;

    const currentSquad = mySquads.find((s) => s.id === selectedSquadId);
    const confirmed = window.confirm(
      action === "delete"
        ? `Delete "${currentSquad?.name ?? "this squad"}" for every member? This cannot be undone.`
        : `Leave "${currentSquad?.name ?? "this squad"}"?`
    );
    if (!confirmed) return;

    setSquadAction(action);
    setActionError(null);
    try {
      if (action === "delete") {
        await api.delete(`/squads/${selectedSquadId}`);
      } else {
        await api.delete(`/squads/${selectedSquadId}/members/me`);
      }

      const nextSquads = mySquads.filter((s) => s.id !== selectedSquadId);
      setMySquads(nextSquads);
      setSelectedSquadId(nextSquads[0]?.id ?? null);
      setDashboard(null);
      setFeed([]);
    } catch (e: unknown) {
      setActionError(errorMessage(e));
    } finally {
      setSquadAction(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card p-6 text-ink-600">
        Loading dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card p-6 text-coral-500 font-bold">
        {error}
      </div>
    );
  }

  if (mySquads.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card p-6">
        <div className="text-lg font-bold">No squads yet</div>
        <div className="mt-2 text-sm text-ink-600">
          Create or join a squad from the Onboarding page to see your dashboard.
        </div>
      </div>
    );
  }

  const currentSquad = mySquads.find((s) => s.id === selectedSquadId);
  const squadName = dashboard?.squad?.name ?? currentSquad?.name ?? "Squad";
  const isCurrentUserAdmin = currentSquad?.role === "admin";

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="font-display font-display text-lg font-bold truncate">{squadName}</h1>
              <select
                value={selectedSquadId ?? ""}
                onChange={(e) => setSelectedSquadId(e.target.value)}
                className="rounded-xl border-2 border-ink-900 bg-white px-3 py-2 text-sm text-ink-800 outline-none transition focus:ring-2 focus:ring-brand-500/40"
                aria-label="Select squad"
              >
                {mySquads.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-1 text-sm text-ink-600">
              Invite code:{" "}
              <span className="font-mono text-ink-800">
                {dashboard?.squad?.inviteCode ?? "-"}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-ink-600">
              Members:{" "}
              <span className="text-ink-800">{dashboard?.members.length ?? 0}</span>
            </div>
            <button
              onClick={() => void removeCurrentSquad("leave")}
              disabled={squadAction !== null}
              className="rounded-xl border-2 border-ink-900 bg-white px-3 py-2 text-sm font-bold text-ink-800 shadow-pop-sm transition active:translate-y-0.5 active:shadow-none hover:bg-ink-100 disabled:opacity-50"
            >
              {squadAction === "leave" ? "Leaving..." : "Leave squad"}
            </button>
            {isCurrentUserAdmin ? (
              <button
                onClick={() => void removeCurrentSquad("delete")}
                disabled={squadAction !== null}
                className="rounded-xl border-2 border-ink-900 bg-coral-500 px-3 py-2 text-sm font-bold text-white shadow-pop-sm transition active:translate-y-0.5 active:shadow-none hover:bg-coral-400 disabled:opacity-50"
              >
                {squadAction === "delete" ? "Deleting..." : "Delete squad"}
              </button>
            ) : null}
            <button
              onClick={triggerRefresh}
              disabled={refreshing}
              className="rounded-xl border-2 border-ink-900 bg-white px-3 py-2 text-sm font-bold text-ink-800 shadow-pop-sm transition active:translate-y-0.5 active:shadow-none hover:bg-ink-100 disabled:opacity-50"
            >
              {refreshing ? "Refreshing..." : "Refresh data"}
            </button>
          </div>
        </div>
        {actionError ? (
          <div className="mt-3 text-sm text-coral-500 font-bold">{actionError}</div>
        ) : null}
      </div>

      <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card p-6">
        <div className="text-sm font-bold">Members</div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {dashboard?.members.map((m) => (
            <MemberCard 
              key={m.id} 
              member={m} 
              connections={dashboard.connections} 
              caches={dashboard.caches} 
              isMe={m.user.email === user?.primaryEmailAddress?.emailAddress}
              squadId={dashboard?.squad?.id}
              api={api}
              onNicknameUpdated={() => triggerRefresh()}
            />
          )) ?? null}
        </div>
      </div>

      <ActivityFeedSection items={feed} />
    </div>
  );
}

function MemberCard(props: {
  member: SquadMember;
  connections: Connection[];
  caches: Cache[];
  isMe?: boolean;
  squadId?: string;
  api?: any;
  onNicknameUpdated?: () => void;
}) {
  const conns = props.connections.filter((c) => c.userId === props.member.user.id);
  const caches = props.caches.filter((c) => c.userId === props.member.user.id);

  const cf = asObject(caches.find((c) => c.platform === "codeforces")?.data);
  const lc = asObject(caches.find((c) => c.platform === "leetcode")?.data);
  const gh = asObject(caches.find((c) => c.platform === "github")?.data);

  const cfConn = conns.find((c) => c.platform === "codeforces");
  const lcConn = conns.find((c) => c.platform === "leetcode");
  const ghConn = conns.find((c) => c.platform === "github");

  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState(props.member.nickname ?? "");
  const [savingNickname, setSavingNickname] = useState(false);

  async function handleSaveNickname() {
    if (!props.api || !props.squadId) return;
    setSavingNickname(true);
    try {
      await props.api.patch(`/squads/${props.squadId}/members/me/nickname`, {
        nickname: nicknameInput.trim() || null
      });
      setEditingNickname(false);
      props.onNicknameUpdated?.();
    } catch (e) {
      console.error(e);
      alert("Failed to update nickname");
    } finally {
      setSavingNickname(false);
    }
  }

  return (
    <div className="rounded-2xl border-2 border-border bg-surface-2 p-4">
      <div className="flex items-center justify-between">
        {editingNickname ? (
          <div className="flex items-center gap-2">
            <input 
              type="text" 
              value={nicknameInput}
              onChange={(e) => setNicknameInput(e.target.value)}
              className="rounded-lg border-2 border-ink-900 px-2 py-1 text-sm outline-none w-32"
              placeholder={props.member.user.username}
              autoFocus
            />
            <button onClick={handleSaveNickname} disabled={savingNickname} className="rounded-lg bg-brand-500 px-2 py-1 text-xs text-white shadow-pop font-bold">Save</button>
            <button onClick={() => setEditingNickname(false)} disabled={savingNickname} className="text-xs text-ink-600 underline">Cancel</button>
          </div>
        ) : (
          <div className="font-bold flex items-center gap-2">
            {props.member.nickname ?? props.member.user.username}
            {props.isMe && (
               <button onClick={() => {
                 setNicknameInput(props.member.nickname ?? "");
                 setEditingNickname(true);
               }} className="text-xs text-brand-500 underline opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                 edit
               </button>
            )}
          </div>
        )}
        <span className="rounded-full border border-border-strong bg-surface-2 px-2 py-0.5 text-xs text-ink-600">
          {props.member.role}
        </span>
      </div>
      <div className="mt-1 text-sm text-ink-400 group flex items-center gap-2">
        {props.member.user.email}
        {props.member.nickname && !editingNickname && <span className="text-xs text-ink-400">(@{props.member.user.username})</span>}
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <Stat
          label="CF rating"
          value={typeof cf?.rating === "number" ? String(cf.rating) : cfConn?.verified ? "..." : "-"}
          sub={cfConn?.verified ? cfConn.username : "not connected"}
        />
        <Stat
          label="LC rating"
          value={typeof lc?.contestRating === "number" ? String(lc.contestRating) : lcConn?.verified ? "..." : "-"}
          sub={lcConn?.verified ? lcConn.username : "not connected"}
        />
        <Stat
          label="LC solved"
          value={typeof lc?.totalSolved === "number" ? String(lc.totalSolved) : lcConn?.verified ? "..." : "-"}
          sub={lcConn?.verified ? lcConn.username : "not connected"}
        />
        <Stat
          label="GH contrib"
          value={
            typeof gh?.totalContributionsThisYear === "number"
              ? String(gh.totalContributionsThisYear)
              : ghConn?.verified
                ? "0"
                : "-"
          }
          sub={ghConn?.verified ? ghConn.username : "not connected"}
        />
      </div>
    </div>
  );
}

function Stat(props: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border-2 border-border bg-surface-2 p-3">
      <div className="text-ink-400">{props.label}</div>
      <div className="mt-1 text-ink-800 text-sm font-bold">{props.value}</div>
      <div className="mt-1 text-ink-400 truncate">{props.sub}</div>
    </div>
  );
}

function ActivityFeedSection(props: { items: FeedItem[] }) {
  const items = props.items ?? [];
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const last24hCutoff = now ? now - 24 * 60 * 60 * 1000 : 0;
  const hasRecent =
    now > 0 ? items.some((i) => new Date(i.createdAt).getTime() >= last24hCutoff) : false;

  return (
    <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-sm font-bold">Activity feed</div>
          <span className="inline-flex items-center gap-1 text-xs text-mint-500 font-bold">
            <span className="h-2 w-2 rounded-full bg-mint-500" />
            Live
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3">
        {!hasRecent ? (
          <div className="rounded-xl border-2 border-border bg-surface-2 p-4 text-sm text-ink-600">
            No recent activity - start solving!
          </div>
        ) : null}

        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 rounded-xl border-2 border-border bg-surface-2 p-4">
            <div className="h-9 w-9 rounded-full bg-brand-100 border-2 border-ink-900 flex items-center justify-center text-sm font-bold text-brand-600">
              {(item.user.username?.[0] ?? "?").toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm text-ink-800 truncate">
                <span className="font-bold">{item.user.username}</span>{" "}
                {item.description}
              </div>
              <div className="mt-0.5 text-xs text-ink-400">
                {timeAgo(item.createdAt)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function timeAgo(iso: string) {
  const t = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - t);
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
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

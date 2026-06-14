import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import { createApiClient, type SquadMember } from "../lib/api";
import { useSquadStore } from "../store/squadStore";
import { usePageTitle } from "../lib/usePageTitle";

/* ------------------------------------------------------------------ */
/*  Types (mirrored from DashboardPage for self-containment)          */
/* ------------------------------------------------------------------ */

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
  activityType: string;
  description: string;
  metadata: unknown;
  createdAt: string;
  user: { id: string; username: string; email: string };
};

/* ------------------------------------------------------------------ */
/*  Scoring helpers                                                    */
/* ------------------------------------------------------------------ */

type SortKey = "score" | "cf" | "lc" | "gh" | "activity";

interface MemberScore {
  userId: string;
  username: string;
  email: string;
  role: "admin" | "member";
  cfRating: number;
  lcSolved: number;
  ghContribs: number;
  activityCount: number;
  score: number;
  cfUsername: string | null;
  lcUsername: string | null;
  ghUsername: string | null;
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function computeScore(cf: number, lc: number, gh: number, act: number): number {
  return Math.round(cf * 0.3 + lc * 10 * 0.3 + gh * 0.2 + act * 50 * 0.2);
}

function buildScores(
  members: SquadMember[],
  connections: Connection[],
  caches: Cache[],
  feedItems: FeedItem[]
): MemberScore[] {
  const activityCounts = new Map<string, number>();
  for (const item of feedItems) {
    activityCounts.set(item.userId, (activityCounts.get(item.userId) ?? 0) + 1);
  }

  return members.map((m) => {
    const uid = m.user.id;
    const userCaches = caches.filter((c) => c.userId === uid);
    const userConns = connections.filter((c) => c.userId === uid);

    const cf = asObject(userCaches.find((c) => c.platform === "codeforces")?.data);
    const lc = asObject(userCaches.find((c) => c.platform === "leetcode")?.data);
    const gh = asObject(userCaches.find((c) => c.platform === "github")?.data);

    const cfRating = typeof cf?.rating === "number" ? cf.rating : 0;
    const lcSolved = typeof lc?.totalSolved === "number" ? lc.totalSolved : 0;
    const ghContribs =
      typeof gh?.totalContributionsThisYear === "number" ? gh.totalContributionsThisYear : 0;
    const activityCount = activityCounts.get(uid) ?? 0;

    return {
      userId: uid,
      username: m.user.username,
      email: m.user.email,
      role: m.role,
      cfRating,
      lcSolved,
      ghContribs,
      activityCount,
      score: computeScore(cfRating, lcSolved, ghContribs, activityCount),
      cfUsername: userConns.find((c) => c.platform === "codeforces" && c.verified)?.username ?? null,
      lcUsername: userConns.find((c) => c.platform === "leetcode" && c.verified)?.username ?? null,
      ghUsername: userConns.find((c) => c.platform === "github" && c.verified)?.username ?? null,
    };
  });
}

function sortScores(scores: MemberScore[], key: SortKey): MemberScore[] {
  const sorted = [...scores];
  sorted.sort((a, b) => {
    switch (key) {
      case "cf":
        return b.cfRating - a.cfRating || b.score - a.score;
      case "lc":
        return b.lcSolved - a.lcSolved || b.score - a.score;
      case "gh":
        return b.ghContribs - a.ghContribs || b.score - a.score;
      case "activity":
        return b.activityCount - a.activityCount || b.score - a.score;
      default:
        return b.score - a.score;
    }
  });
  return sorted;
}

/* ------------------------------------------------------------------ */
/*  Error helper                                                       */
/* ------------------------------------------------------------------ */

function errorMessage(e: unknown) {
  if (axios.isAxiosError(e)) {
    const data = e.response?.data as { error?: string } | undefined;
    return data?.error ?? e.message ?? "Request failed";
  }
  if (e instanceof Error) return e.message;
  return "Something went wrong";
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export function LeaderboardPage() {
  usePageTitle("Leaderboard | SquadCode");

  const { getToken } = useAuth();
  const api = useMemo(() => createApiClient(() => getToken()), [getToken]);

  const selectedSquadId = useSquadStore((s) => s.selectedSquadId);

  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("score");

  /* ---- Data fetching ---- */

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!selectedSquadId) {
        setDashboard(null);
        setFeed([]);
        setLoading(false);
        return;
      }
      setError(null);
      setLoading(true);
      try {
        const [dashRes, feedRes] = await Promise.all([
          api.get(`/squads/${selectedSquadId}/dashboard`),
          api.get(`/feed/${selectedSquadId}`),
        ]);
        if (!alive) return;
        setDashboard(dashRes.data as DashboardPayload);
        setFeed((feedRes.data?.items ?? []) as FeedItem[]);
      } catch (e: unknown) {
        if (!alive) return;
        setError(errorMessage(e));
      } finally {
        if (alive) setLoading(false);
      }
    }
    void load();
    return () => {
      alive = false;
    };
  }, [api, selectedSquadId]);

  async function triggerRefresh() {
    if (!selectedSquadId) return;
    setRefreshing(true);
    try {
      await api.post(`/platformData/refresh/${selectedSquadId}`);
      const [dashRes, feedRes] = await Promise.all([
        api.get(`/squads/${selectedSquadId}/dashboard`),
        api.get(`/feed/${selectedSquadId}`),
      ]);
      setDashboard(dashRes.data as DashboardPayload);
      setFeed((feedRes.data?.items ?? []) as FeedItem[]);
    } catch (e: unknown) {
      setError(errorMessage(e));
    } finally {
      setRefreshing(false);
    }
  }

  /* ---- Computed scores ---- */

  const ranked = useMemo(() => {
    if (!dashboard) return [];
    return sortScores(
      buildScores(dashboard.members, dashboard.connections, dashboard.caches, feed),
      sortKey
    );
  }, [dashboard, feed, sortKey]);

  const top3 = ranked.slice(0, 3);

  /* ---- No squad selected ---- */

  if (!selectedSquadId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card p-8 text-center max-w-md">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 border-2 border-ink-900">
            <span className="text-2xl">🏆</span>
          </div>
          <h2 className="font-display text-lg font-bold text-ink-800">No squad selected</h2>
          <p className="mt-2 text-sm text-ink-600">
            Select or join a squad from the Dashboard to see the leaderboard.
          </p>
        </div>
      </div>
    );
  }

  /* ---- Loading ---- */

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 animate-pulse">
        <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card p-6">
          <div className="h-6 w-48 rounded-lg bg-ink-100" />
          <div className="mt-4 grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 rounded-2xl bg-ink-100" />
            ))}
          </div>
        </div>
        <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card p-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="mb-3 h-14 rounded-xl bg-ink-100" />
          ))}
        </div>
      </div>
    );
  }

  /* ---- Error ---- */

  if (error) {
    return (
      <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card p-6 text-coral-500 font-bold">
        {error}
      </div>
    );
  }

  /* ---- Main render ---- */

  return (
    <div className="grid grid-cols-1 gap-6">
      {/* ─── Header ─── */}
      <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            <h1 className="font-display text-lg font-bold text-ink-800">Leaderboard</h1>
            <span className="rounded-full bg-brand-100 border border-brand-300 px-2.5 py-0.5 text-xs font-bold text-brand-600">
              {ranked.length} member{ranked.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Sort dropdown */}
            <div className="flex items-center gap-2">
              <label htmlFor="lb-sort" className="text-xs font-bold text-ink-600 whitespace-nowrap">
                Sort by
              </label>
              <select
                id="lb-sort"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="rounded-xl border-2 border-ink-900 bg-white px-3 py-2 text-sm text-ink-800 outline-none transition focus:ring-2 focus:ring-brand-500/40"
              >
                <option value="score">Composite Score</option>
                <option value="cf">CF Rating</option>
                <option value="lc">LC Solved</option>
                <option value="gh">GH Contributions</option>
                <option value="activity">Activity Count</option>
              </select>
            </div>

            {/* Refresh */}
            <button
              onClick={() => void triggerRefresh()}
              disabled={refreshing}
              className="rounded-xl border-2 border-ink-900 bg-brand-500 px-4 py-2 text-sm font-bold text-white shadow-pop transition active:translate-y-1 active:shadow-none hover:bg-brand-400 disabled:opacity-50"
            >
              {refreshing ? (
                <span className="flex items-center gap-2">
                  <Spinner /> Refreshing…
                </span>
              ) : (
                "↻ Refresh"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ─── Top 3 Podium ─── */}
      {top3.length > 0 && (
        <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-base">👑</span>
            <h2 className="font-display text-sm font-bold text-ink-800">Top Performers</h2>
          </div>
          <div className="flex flex-col md:flex-row items-end justify-center gap-4 md:gap-6">
            {/* Second place (left) */}
            {top3[1] && (
              <div className="order-1 md:order-1 w-full md:w-1/3 transition-all duration-500">
                <PodiumCard member={top3[1]} rank={2} />
              </div>
            )}
            {/* First place (center, elevated) */}
            {top3[0] && (
              <div className="order-0 md:order-2 w-full md:w-1/3 md:-translate-y-4 transition-all duration-500">
                <PodiumCard member={top3[0]} rank={1} />
              </div>
            )}
            {/* Third place (right) */}
            {top3[2] && (
              <div className="order-2 md:order-3 w-full md:w-1/3 transition-all duration-500">
                <PodiumCard member={top3[2]} rank={3} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Full table ─── */}
      <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card p-6">
        <h2 className="font-display text-sm font-bold text-ink-800 mb-4">Full Rankings</h2>

        {/* Table header */}
        <div className="hidden sm:grid grid-cols-[3rem_1fr_5.5rem_5.5rem_5.5rem_4rem_6rem] gap-2 px-4 pb-2 text-xs font-bold text-ink-400 uppercase tracking-wide border-b-2 border-border">
          <div>#</div>
          <div>Member</div>
          <div className="text-right">CF Rating</div>
          <div className="text-right">LC Solved</div>
          <div className="text-right">GH Contrib</div>
          <div className="text-right">Acts</div>
          <div className="text-right">Score</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border-subtle">
          {ranked.map((m, i) => (
            <LeaderboardRow key={m.userId} member={m} rank={i + 1} sortKey={sortKey} />
          ))}
        </div>

        {ranked.length === 0 && (
          <div className="py-12 text-center text-sm text-ink-400">
            No members found. Invite your squad to get started!
          </div>
        )}
      </div>

      {/* ─── Legend ─── */}
      <div className="rounded-2xl border-2 border-border bg-surface-1 shadow-card p-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-ink-600">
          <span className="font-bold text-ink-800">Score formula:</span>
          <span>CF Rating × 0.3</span>
          <span className="text-ink-200">+</span>
          <span>LC Solved × 10 × 0.3</span>
          <span className="text-ink-200">+</span>
          <span>GH Contributions × 0.2</span>
          <span className="text-ink-200">+</span>
          <span>Activity Count × 50 × 0.2</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Podium Card                                                        */
/* ------------------------------------------------------------------ */

function PodiumCard({ member, rank }: { member: MemberScore; rank: 1 | 2 | 3 }) {
  const config = {
    1: {
      border: "border-sun-400",
      bg: "bg-gradient-to-br from-sun-300/20 to-sun-400/10",
      badge: "bg-sun-400 text-ink-900",
      icon: "👑",
      glow: "shadow-[0_0_24px_rgba(255,184,0,0.18)]",
      avatarRing: "ring-4 ring-sun-400/40",
      label: "1st Place",
    },
    2: {
      border: "border-ink-200",
      bg: "bg-gradient-to-br from-ink-100/60 to-ink-200/30",
      badge: "bg-ink-200 text-ink-800",
      icon: "🥈",
      glow: "",
      avatarRing: "ring-4 ring-ink-200/40",
      label: "2nd Place",
    },
    3: {
      border: "border-coral-300",
      bg: "bg-gradient-to-br from-coral-300/20 to-coral-400/10",
      badge: "bg-coral-300 text-ink-900",
      icon: "🥉",
      glow: "",
      avatarRing: "ring-4 ring-coral-300/40",
      label: "3rd Place",
    },
  }[rank];

  return (
    <div
      className={`relative rounded-2xl border-2 ${config.border} ${config.bg} ${config.glow} p-5 transition-all duration-500 hover:scale-[1.02]`}
    >
      {/* Rank badge */}
      <div className="flex items-center justify-between mb-4">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full ${config.badge} px-3 py-1 text-xs font-bold`}
        >
          {config.icon} {config.label}
        </span>
        {member.role === "admin" && (
          <span className="rounded-full border border-border-strong bg-surface-2 px-2 py-0.5 text-[10px] font-bold text-ink-600">
            admin
          </span>
        )}
      </div>

      {/* Avatar & name */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 border-2 border-ink-900 text-lg font-bold text-brand-600 ${config.avatarRing}`}
        >
          {(member.username?.[0] ?? "?").toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="font-bold text-ink-800 truncate">{member.username}</div>
          <div className="text-xs text-ink-400 truncate">{member.email}</div>
        </div>
      </div>

      {/* Stats mini grid */}
      <div className="grid grid-cols-2 gap-2">
        <MiniStat label="CF" value={member.cfRating} color="text-brand-500" />
        <MiniStat label="LC" value={member.lcSolved} color="text-mint-500" />
        <MiniStat label="GH" value={member.ghContribs} color="text-ink-600" />
        <MiniStat label="Acts" value={member.activityCount} color="text-sun-500" />
      </div>

      {/* Score */}
      <div className="mt-4 flex items-baseline justify-between rounded-xl border-2 border-border bg-surface-0/70 px-3 py-2">
        <span className="text-xs font-bold text-ink-400">Score</span>
        <span className="font-display text-lg font-bold text-ink-800">
          {member.score.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Leaderboard Row                                                    */
/* ------------------------------------------------------------------ */

function LeaderboardRow({
  member,
  rank,
  sortKey,
}: {
  member: MemberScore;
  rank: number;
  sortKey: SortKey;
}) {
  const rankColors: Record<number, string> = {
    1: "bg-sun-400 text-ink-900",
    2: "bg-ink-200 text-ink-800",
    3: "bg-coral-300 text-ink-900",
  };
  const rankBg = rankColors[rank] ?? "bg-surface-2 text-ink-600";

  const highlightCol: Record<SortKey, string> = {
    score: "",
    cf: "cf",
    lc: "lc",
    gh: "gh",
    activity: "activity",
  };
  const hl = highlightCol[sortKey];

  return (
    <div className="group grid grid-cols-1 sm:grid-cols-[3rem_1fr_5.5rem_5.5rem_5.5rem_4rem_6rem] gap-2 items-center px-4 py-3 transition-colors duration-200 hover:bg-brand-50/50">
      {/* Rank */}
      <div className="flex items-center">
        <span
          className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${rankBg}`}
        >
          {rank}
        </span>
      </div>

      {/* Member info */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 border-2 border-ink-900 text-sm font-bold text-brand-600">
          {(member.username?.[0] ?? "?").toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="font-bold text-sm text-ink-800 truncate">{member.username}</div>
          <div className="text-xs text-ink-400 truncate flex gap-2">
            {member.cfUsername && <span>cf:{member.cfUsername}</span>}
            {member.lcUsername && <span>lc:{member.lcUsername}</span>}
            {member.ghUsername && <span>gh:{member.ghUsername}</span>}
            {!member.cfUsername && !member.lcUsername && !member.ghUsername && (
              <span>no connections</span>
            )}
          </div>
        </div>
      </div>

      {/* Stats (responsive: stacked on mobile, grid cols on desktop) */}
      <div className="flex sm:contents gap-4 pl-12 sm:pl-0 flex-wrap">
        <div
          className={`text-right text-sm tabular-nums ${
            hl === "cf" ? "font-bold text-brand-500" : "text-ink-800"
          }`}
        >
          <span className="sm:hidden text-xs text-ink-400 mr-1">CF:</span>
          {member.cfRating || "–"}
        </div>
        <div
          className={`text-right text-sm tabular-nums ${
            hl === "lc" ? "font-bold text-mint-500" : "text-ink-800"
          }`}
        >
          <span className="sm:hidden text-xs text-ink-400 mr-1">LC:</span>
          {member.lcSolved || "–"}
        </div>
        <div
          className={`text-right text-sm tabular-nums ${
            hl === "gh" ? "font-bold text-ink-800" : "text-ink-800"
          }`}
        >
          <span className="sm:hidden text-xs text-ink-400 mr-1">GH:</span>
          {member.ghContribs || "–"}
        </div>
        <div
          className={`text-right text-sm tabular-nums ${
            hl === "activity" ? "font-bold text-sun-500" : "text-ink-800"
          }`}
        >
          <span className="sm:hidden text-xs text-ink-400 mr-1">Acts:</span>
          {member.activityCount || "–"}
        </div>
        <div className="text-right">
          <span className="inline-flex items-center rounded-lg bg-brand-100 border border-brand-300 px-2 py-0.5 text-sm font-bold text-brand-600 tabular-nums">
            {member.score.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Small reusable pieces                                              */
/* ------------------------------------------------------------------ */

function MiniStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-0/60 px-2.5 py-1.5">
      <div className="text-[10px] font-bold text-ink-400 uppercase tracking-wider">{label}</div>
      <div className={`text-sm font-bold ${color} tabular-nums`}>{value || "–"}</div>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

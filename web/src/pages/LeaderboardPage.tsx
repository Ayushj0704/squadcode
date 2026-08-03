import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import { createApiClient, type SquadMember } from "../lib/api";
import { useSquadStore } from "../store/squadStore";
import { usePageTitle } from "../lib/usePageTitle";
import Lanyard from "../components/ui/lanyard/Lanyard";

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
  user: { id: string; username: string; email: string; profileImageUrl?: string | null };
};

/* ------------------------------------------------------------------ */
/*  Scoring helpers                                                    */
/* ------------------------------------------------------------------ */

type SortKey = "score" | "cf" | "lc" | "lc_rating" | "gh" | "activity";
type TimeRange = "all" | "week" | "month";

interface MemberScore {
  userId: string;
  username: string;
  originalUsername: string;
  role: "admin" | "member";
  cfRating: number;
  lcSolved: number;
  lcRating: number;
  ghContribs: number;
  activityCount: number;
  activityDelta: number;
  score: number;
  cfUsername: string | null;
  lcUsername: string | null;
  ghUsername: string | null;
  profileImageUrl?: string | null;
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function computeScore(cf: number, lc: number, lcRating: number, gh: number, act: number): number {
  return Math.round(cf * 0.3 + lc * 10 * 0.3 + lcRating * 0.3 + gh * 0.2 + act * 50 * 0.2);
}

function getWindowStart(period: TimeRange) {
  const date = new Date();
  if (period === "week") {
    date.setDate(date.getDate() - 7);
    return date;
  }
  if (period === "month") {
    date.setMonth(date.getMonth() - 1);
    return date;
  }
  return null;
}

function filterFeedByRange(items: FeedItem[], period: TimeRange) {
  const start = getWindowStart(period);
  if (!start) return items;
  return items.filter((item) => new Date(item.createdAt) >= start);
}

function countFeedByUser(items: FeedItem[]) {
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item.userId, (counts.get(item.userId) ?? 0) + 1);
  }
  return counts;
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
    const lcRating = typeof lc?.contestRating === "number" ? lc.contestRating : 0;
    const ghContribs =
      typeof gh?.totalContributionsThisYear === "number" ? gh.totalContributionsThisYear : 0;
    const activityCount = activityCounts.get(uid) ?? 0;

    return {
      userId: uid,
      username: m.nickname ?? m.user.username,
      originalUsername: m.user.username,
      role: m.role,
      cfRating,
      lcSolved,
      lcRating,
      ghContribs,
      activityCount,
      activityDelta: 0,
      score: computeScore(cfRating, lcSolved, lcRating, ghContribs, activityCount),
      cfUsername: userConns.find((c) => c.platform === "codeforces" && c.verified)?.username ?? null,
      lcUsername: userConns.find((c) => c.platform === "leetcode" && c.verified)?.username ?? null,
      ghUsername: userConns.find((c) => c.platform === "github" && c.verified)?.username ?? null,
      profileImageUrl: m.user.profileImageUrl ?? null,
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
      case "lc_rating":
        return b.lcRating - a.lcRating || b.score - a.score;
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
  const [period, setPeriod] = useState<TimeRange>("all");
  const [featuredUserId, setFeaturedUserId] = useState<string | null>(null);

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

  const periodFeed = useMemo(() => filterFeedByRange(feed, period), [feed, period]);
  const previousPeriodFeed = useMemo(() => {
    if (period === "all") return [];
    const currentStart = getWindowStart(period);
    if (!currentStart) return [];
    const previousEnd = currentStart;
    const previousStart = new Date(currentStart);
    if (period === "week") previousStart.setDate(previousStart.getDate() - 7);
    if (period === "month") previousStart.setMonth(previousStart.getMonth() - 1);
    return feed.filter((item) => {
      const date = new Date(item.createdAt);
      return date >= previousStart && date < previousEnd;
    });
  }, [feed, period]);

  const currentActivityCounts = useMemo(() => countFeedByUser(periodFeed), [periodFeed]);
  const previousActivityCounts = useMemo(() => countFeedByUser(previousPeriodFeed), [previousPeriodFeed]);

  const ranked = useMemo(() => {
    if (!dashboard) return [];
    return sortScores(
      buildScores(dashboard.members, dashboard.connections, dashboard.caches, periodFeed).map((member) => ({
        ...member,
        activityDelta:
          (currentActivityCounts.get(member.userId) ?? 0) -
          (previousActivityCounts.get(member.userId) ?? 0),
      })),
      sortKey
    );
  }, [dashboard, periodFeed, sortKey, currentActivityCounts, previousActivityCounts]);

  const top3 = ranked.slice(0, 3);
  const featuredMember = ranked.find((member) => member.userId === featuredUserId) ?? ranked[0];

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
                className="rounded-xl border-2 border-ink-900 bg-surface-0 px-3 py-2 text-sm text-ink-800 outline-none transition focus:ring-2 focus:ring-brand-500/40"
              >
                <option value="score">Composite Score</option>
                <option value="cf">CF Rating</option>
                <option value="lc_rating">LC Rating</option>
                <option value="lc">LC Solved</option>
                <option value="gh">GH Contributions</option>
                <option value="activity">Activity Count</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="lb-period" className="text-xs font-bold text-ink-600 whitespace-nowrap">
                Period
              </label>
              <select
                id="lb-period"
                value={period}
                onChange={(e) => setPeriod(e.target.value as TimeRange)}
                className="rounded-xl border-2 border-ink-900 bg-surface-0 px-3 py-2 text-sm text-ink-800 outline-none transition focus:ring-2 focus:ring-brand-500/40"
              >
                <option value="all">All time</option>
                <option value="month">This month</option>
                <option value="week">This week</option>
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

      {/* ─── Interactive squad ID ─── */}
      {featuredMember && (
        <div className="relative overflow-hidden rounded-2xl border-2 border-ink-900 bg-[#101827] shadow-card">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(124,219,255,.18),transparent_28%),radial-gradient(circle_at_82%_80%,rgba(163,230,53,.15),transparent_28%)]" />
          <div className="relative grid min-h-[580px] grid-cols-1 lg:grid-cols-[1fr_1.1fr]">
            <div className="flex flex-col justify-center p-6 sm:p-9 text-white">
              <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[.15em] text-brand-100">
                <span className="h-2 w-2 rounded-full bg-brand-300 animate-pulse" /> Live squad ID
              </div>
              <p className="text-sm font-semibold text-brand-100">Drag the card to inspect both sides</p>
              <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Meet the builders<br />behind the rank.</h2>
              <p className="mt-4 max-w-md text-sm leading-6 text-slate-300">Each ID pulls its numbers from your squad’s live Codeforces, LeetCode, GitHub and activity data.</p>

              <div className="mt-7 flex flex-wrap gap-2">
                {top3.map((member, index) => (
                  <button
                    key={member.userId}
                    type="button"
                    onClick={() => setFeaturedUserId(member.userId)}
                    className={`rounded-xl border px-3 py-2 text-left transition ${featuredMember.userId === member.userId ? "border-brand-300 bg-brand-400 text-ink-900 shadow-[0_6px_18px_rgba(163,230,53,.2)]" : "border-white/15 bg-white/5 text-white hover:bg-white/10"}`}
                  >
                    <span className="block text-[10px] font-bold uppercase tracking-wider opacity-70">#{index + 1} squad rank</span>
                    <span className="block max-w-28 truncate text-sm font-extrabold">{member.username}</span>
                  </button>
                ))}
              </div>

              <div className="mt-7 grid max-w-md grid-cols-2 gap-3">
                <SpotlightStat label="Codeforces" value={featuredMember.cfRating || "—"} detail={featuredMember.cfUsername ? `@${featuredMember.cfUsername}` : "Not connected"} />
                <SpotlightStat label="LeetCode solved" value={featuredMember.lcSolved || "—"} detail={featuredMember.lcUsername ? `@${featuredMember.lcUsername}` : "Not connected"} />
                <SpotlightStat label="GitHub contribs" value={featuredMember.ghContribs || "—"} detail={featuredMember.ghUsername ? `@${featuredMember.ghUsername}` : "Not connected"} />
                <SpotlightStat label="Squad score" value={featuredMember.score.toLocaleString()} detail={`${featuredMember.activityCount} logged activities`} accent />
              </div>
            </div>
            <div className="relative min-h-[580px] overflow-hidden">
              <Lanyard
                key={featuredMember.userId}
                position={[0, 0, 13]}
                gravity={[0, -40, 0]}
                frontImage={makeMemberIdImage(featuredMember, ranked.findIndex((m) => m.userId === featuredMember.userId) + 1, "front")}
                backImage={makeMemberIdImage(featuredMember, ranked.findIndex((m) => m.userId === featuredMember.userId) + 1, "back")}
                imageFit="cover"
                lanyardWidth={0.8}
              />
              <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-slate-950/75 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-300 backdrop-blur">Grab &amp; swing</div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Full table ─── */}
      <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card p-6">
        <h2 className="font-display text-sm font-bold text-ink-800 mb-4">Full Rankings</h2>

        {/* Table header */}
        <div className="hidden sm:grid grid-cols-[3rem_1fr_4.5rem_4.5rem_4.5rem_4.5rem_4rem_6rem] gap-2 px-4 pb-2 text-xs font-bold text-ink-400 uppercase tracking-wide border-b-2 border-border">
          <div>#</div>
          <div>Member</div>
          <div className="text-right">CF Rate</div>
          <div className="text-right">LC Rate</div>
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
          <span>LC Rating × 0.3</span>
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
    lc_rating: "lc_rating",
    gh: "gh",
    activity: "activity",
  };
  const hl = highlightCol[sortKey];

  return (
    <div className="group grid grid-cols-1 sm:grid-cols-[3rem_1fr_4.5rem_4.5rem_4.5rem_4.5rem_4rem_6rem] gap-2 items-center px-4 py-3 transition-colors duration-200 hover:bg-brand-50/50">
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
        {member.profileImageUrl ? (
          <img src={member.profileImageUrl} alt={member.username} className="h-9 w-9 shrink-0 rounded-full border-2 border-ink-900 object-cover" />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 border-2 border-ink-900 text-sm font-bold text-brand-600">
            {(member.username?.[0] ?? "?").toUpperCase()}
          </div>
        )}
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
            hl === "lc_rating" ? "font-bold text-mint-500" : "text-ink-800"
          }`}
        >
          <span className="sm:hidden text-xs text-ink-400 mr-1">LCR:</span>
          {member.lcRating || "–"}
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
          <div className={`mt-1 text-[10px] font-bold ${member.activityDelta >= 0 ? "text-mint-500" : "text-coral-500"}`}>
            {member.activityDelta >= 0 ? "+" : ""}
            {member.activityDelta} act
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Small reusable pieces                                              */
/* ------------------------------------------------------------------ */

function SpotlightStat({ label, value, detail, accent = false }: { label: string; value: string | number; detail: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${accent ? "border-brand-300/50 bg-brand-400/15" : "border-white/10 bg-white/5"}`}>
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
      <div className={`mt-0.5 text-xl font-extrabold tabular-nums ${accent ? "text-brand-200" : "text-white"}`}>{value}</div>
      <div className="mt-0.5 truncate text-[10px] text-slate-400">{detail}</div>
    </div>
  );
}

function makeMemberIdImage(member: MemberScore, rank: number, face: "front" | "back") {
  const safe = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&apos;", '"': "&quot;" })[character] ?? character);
  const name = safe(member.username.slice(0, 20));
  const handle = safe(`@${member.originalUsername}`);
  const entries = face === "front"
    ? [["CF RATING", member.cfRating || "—"], ["LC SOLVED", member.lcSolved || "—"], ["GITHUB CONTRIBS", member.ghContribs || "—"], ["SQUAD SCORE", member.score.toLocaleString()]]
    : [["LEETCODE RATING", member.lcRating || "—"], ["ACTIVITIES", member.activityCount], ["ROLE", member.role.toUpperCase()], ["RANK", `#${rank}`]];
  const rows = entries.map(([label, value], index) => {
    const y = 290 + index * 108;
    return `<rect x="54" y="${y}" width="612" height="88" rx="20" fill="#1e293b" fill-opacity=".75" stroke="#C9FE6E" stroke-opacity=".3" stroke-width="1.5"/><text x="80" y="${y + 34}" fill="#C9FE6E" font-family="Arial, sans-serif" font-size="22" font-weight="800" letter-spacing="2">${label}</text><text x="80" y="${y + 68}" fill="#ffffff" font-family="Arial, sans-serif" font-size="34" font-weight="900">${safe(String(value))}</text>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1080" viewBox="0 0 720 1080"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0b132b"/><stop offset=".5" stop-color="#1c2541"/><stop offset="1" stop-color="#0b132b"/></linearGradient><filter id="b"><feGaussianBlur stdDeviation="30"/></filter></defs><rect width="720" height="1080" fill="url(#g)"/><circle cx="580" cy="150" r="180" fill="#C9FE6E" fill-opacity=".25" filter="url(#b)"/><circle cx="110" cy="780" r="220" fill="#38bdf8" fill-opacity=".2" filter="url(#b)"/><rect x="36" y="36" width="648" height="1008" rx="36" fill="none" stroke="#C9FE6E" stroke-opacity=".4" stroke-width="3"/><text x="54" y="95" fill="#C9FE6E" font-family="Arial, sans-serif" font-size="26" font-weight="900" letter-spacing="4">SQUADCODE // MEMBER ID</text><text x="54" y="172" fill="#ffffff" font-family="Arial, sans-serif" font-size="54" font-weight="900">${name}</text><text x="54" y="214" fill="#BBEFFF" font-family="Arial, sans-serif" font-size="26" font-weight="700">${handle}</text><text x="54" y="260" fill="#71CFA3" font-family="Arial, sans-serif" font-size="22" font-weight="800" letter-spacing="2">${face === "front" ? "PERFORMANCE SNAPSHOT" : "SQUAD STATUS"}</text>${rows}<text x="54" y="965" fill="#94A3B8" font-family="Arial, sans-serif" font-size="20" font-weight="700" letter-spacing="2">${member.ghUsername ? `GITHUB @${safe(member.ghUsername)}` : "KEEP BUILDING"}</text><text x="54" y="1002" fill="#C9FE6E" font-family="Arial, sans-serif" font-size="22" font-weight="900">${face === "front" ? "SHIP. SOLVE. RISE." : "ONE SQUAD. MANY WINS."}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
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

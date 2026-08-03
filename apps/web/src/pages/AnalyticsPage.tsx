import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { createApiClient } from "../lib/api";
import { useSquadStore } from "../store/squadStore";
import { usePageTitle } from "../lib/usePageTitle";

type AnalyticsPayload = {
  squad: { id: string; name: string };
  solvedByDay: Array<{ date: string; solves: number }>;
  platformBreakdown: Array<{ platform: string; count: number }>;
  topContributors: Array<{ userId: string; username: string; count: number }>;
  sheetCompletion: Array<{
    id: string;
    title: string;
    completionRate: number;
    completedCount: number;
    totalMembers: number;
    dueDate: string | null;
    problemCount: number;
  }>;
  contestParticipation: Array<{ id: string; title: string; posts: number }>;
  mostIgnoredSheet: null | {
    id: string;
    title: string;
    completionRate: number;
    completedCount: number;
    totalMembers: number;
    dueDate: string | null;
    problemCount: number;
  };
  memberTrends: Array<{
    userId: string;
    username: string;
    total: number;
    recent: number;
    previous: number;
    delta: number;
  }>;
  progressSeries: Array<Record<string, number | string>>;
  progressMembers: string[];
};

// Distinct line colours for the per-member progress chart.
const MEMBER_COLORS = ["#6E56FF", "#14B8A6", "#FF8A73", "#FFB800", "#5B3DF0"];

export function AnalyticsPage() {
  usePageTitle("Analytics | SquadCode");
  const { getToken } = useAuth();
  const api = useMemo(() => createApiClient(() => getToken()), [getToken]);
  const selectedSquadId = useSquadStore((s) => s.selectedSquadId);

  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "all">("all");

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!selectedSquadId) {
        setData(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/analytics/${selectedSquadId}`);
        if (!alive) return;
        setData(res.data as AnalyticsPayload);
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

  if (!selectedSquadId) {
    return (
      <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card p-6 text-ink-600">
        Select a squad from the dashboard first.
      </div>
    );
  }

  if (loading) {
    return <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card p-6">Loading analytics...</div>;
  }

  if (error) {
    return <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card p-6 text-coral-500 font-bold">{error}</div>;
  }

  const now = new Date();
  const timeLimit = timeRange === "7d" ? 7 * 86400000 : timeRange === "30d" ? 30 * 86400000 : Infinity;
  
  const lineData = (data?.solvedByDay ?? []).filter(d => {
    return now.getTime() - new Date(d.date).getTime() <= timeLimit;
  });
  const platformData = data?.platformBreakdown ?? [];
  const progressSeries = data?.progressSeries ?? [];
  const progressMembers = data?.progressMembers ?? [];

  return (
    <div className="grid grid-cols-1 gap-6">
      {/* Header and Filter */}
      <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">{data?.squad?.name ?? "Squad"} Analytics</h1>
          <p className="mt-1 text-sm text-ink-600">Track solves, platform balance, and sheet participation.</p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as any)}
          className="rounded-xl border-2 border-border bg-surface-0 px-4 py-2 font-bold text-ink-700 shadow-pop-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="all">All Time</option>
        </select>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartCard title="Problems solved over time">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
              <XAxis dataKey="date" tickMargin={8} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="solves" stroke="#6E56FF" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Platform breakdown">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={platformData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
              <XAxis dataKey="platform" tickMargin={8} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#14B8A6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ─── Who's improving / who needs motivation (Reddit ask) ─── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartCard title="Momentum (last 7 days vs previous 7)">
          <MomentumBoard trends={data?.memberTrends ?? []} />
        </ChartCard>

        <ChartCard title="Cumulative progress by member">
          {progressSeries.length > 0 && progressMembers.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={progressSeries}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="date" tickMargin={8} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                {progressMembers.map((name, i) => (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={MEMBER_COLORS[i % MEMBER_COLORS.length]}
                    strokeWidth={2.5}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[280px] items-center justify-center text-sm text-ink-500">
              Not enough solve history yet.
            </div>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <ChartCard title="Top contributors">
          <div className="space-y-3">
            {(data?.topContributors ?? []).map((user, index) => (
              <div key={user.userId} className="flex items-center justify-between rounded-xl border border-border bg-surface-1 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-bold">
                    {index + 1}
                  </span>
                  <span className="font-bold text-ink-800">{user.username}</span>
                </div>
                <span className="text-sm font-bold text-ink-600">{user.count} activities</span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Sheet completion">
          <div className="space-y-3">
            {(data?.sheetCompletion ?? []).map((sheet) => (
              <div key={sheet.id} className="rounded-xl border border-border bg-surface-1 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-ink-800">{sheet.title}</div>
                    <div className="text-xs text-ink-500">{sheet.problemCount} problems</div>
                  </div>
                  <div className="text-sm font-bold text-ink-800">{sheet.completionRate}%</div>
                </div>
                <div className="mt-3 h-2 rounded-full bg-surface-2 overflow-hidden">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${sheet.completionRate}%` }} />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Contest participation">
          <div className="space-y-3">
            {(data?.contestParticipation ?? []).map((thread) => (
              <div key={thread.id} className="flex items-center justify-between rounded-xl border border-border bg-surface-1 px-4 py-3">
                <span className="font-bold text-ink-800 truncate">{thread.title}</span>
                <span className="text-sm font-bold text-ink-600">{thread.posts} posts</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

type MemberTrend = {
  userId: string;
  username: string;
  total: number;
  recent: number;
  previous: number;
  delta: number;
};

function MomentumBoard({ trends }: { trends: MemberTrend[] }) {
  if (trends.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-ink-500">
        No solve activity yet.
      </div>
    );
  }

  // Split by momentum: improving (delta > 0) vs needs motivation
  // (delta < 0, or no recent solves at all).
  const rising = trends.filter((t) => t.delta > 0);
  const cooling = [...trends]
    .filter((t) => t.delta < 0 || t.recent === 0)
    .sort((a, b) => a.delta - b.delta || a.recent - b.recent);

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-teal-600">
          <TrendingUp size={16} /> Improving fastest
        </div>
        <div className="space-y-2">
          {rising.length > 0 ? (
            rising.slice(0, 3).map((t) => <TrendRow key={t.userId} trend={t} tone="up" />)
          ) : (
            <div className="text-xs text-ink-500">No one is trending up this week yet.</div>
          )}
        </div>
      </div>
      <div>
        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-coral-500">
          <TrendingDown size={16} /> Might need motivation
        </div>
        <div className="space-y-2">
          {cooling.length > 0 ? (
            cooling.slice(0, 3).map((t) => <TrendRow key={t.userId} trend={t} tone="down" />)
          ) : (
            <div className="text-xs text-ink-500">Everyone's keeping pace. 🎉</div>
          )}
        </div>
      </div>
    </div>
  );
}

function TrendRow({ trend, tone }: { trend: MemberTrend; tone: "up" | "down" }) {
  const deltaLabel =
    trend.delta > 0 ? `+${trend.delta}` : trend.delta < 0 ? `${trend.delta}` : "±0";
  const Icon = trend.delta > 0 ? TrendingUp : trend.delta < 0 ? TrendingDown : Minus;
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-surface-1 px-4 py-3">
      <div>
        <div className="font-bold text-ink-800">{trend.username}</div>
        <div className="text-xs text-ink-500">
          {trend.recent} this week · {trend.total} all time
        </div>
      </div>
      <span
        className={`inline-flex items-center gap-1 text-sm font-bold ${
          tone === "up" ? "text-teal-600" : "text-coral-500"
        }`}
      >
        <Icon size={14} /> {deltaLabel}
      </span>
    </div>
  );
}

function ChartCard(props: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card p-6">
      <h2 className="mb-4 font-display text-lg font-bold text-ink-900">{props.title}</h2>
      {props.children}
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

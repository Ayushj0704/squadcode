import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import axios from "axios";
import { createApiClient, apiBaseUrl, type SquadMember } from "../lib/api";
import { useSquadStore } from "../store/squadStore";
import { usePageTitle } from "../lib/usePageTitle";
import { usePlan } from "../lib/usePlan";
import { PageSkeleton, ErrorState } from "../components/States";
import { useToast, useDialog } from "../components/ui/Notifications";
import { RefreshCw, Sparkles, Copy, Users, ExternalLink,
  TrendingUp, Code2, GitBranch, Award, Flame, X,
  Plus, AlertCircle, CheckCircle2, Zap
} from "lucide-react";
import { CometCard } from "@/components/ui/comet-card";


// ── Types ────────────────────────────────────────────────────────────────────
type MySquad = {
  id: string; name: string; description: string | null;
  role: "admin" | "member"; joinedAt: string; createdAt: string;
};
type Connection = {
  userId: string; platform: "codeforces" | "leetcode" | "github";
  username: string; verified: boolean;
};
type Cache = {
  userId: string; platform: "codeforces" | "leetcode" | "github";
  data: unknown; fetchedAt: string;
};
type DashboardPayload = {
  squadId: string;
  squad?: { id: string; name: string; inviteCode: string };
  members: SquadMember[];
  connections: Connection[];
  caches: Cache[];
};
type FeedItem = {
  id: string; squadId: string; userId: string;
  platform: "codeforces" | "leetcode" | "github";
  activityType: "problem_solved" | "rating_changed" | "contest_participated";
  description: string; metadata: unknown; createdAt: string;
  user: { id: string; username: string; email: string; profileImageUrl?: string | null };
};

// ── Palette ───────────────────────────────────────────────────────────────────
const P = {
  lime:   "#C9FE6E",
  sky:    "var(--p-sky, #BBEFFF)",
  mint:   "var(--p-mint, #71CFA3)",
  grey:   "var(--p-grey, #F3F3F3)",
  white:  "var(--p-white, #FFFFFF)",
  ink:    "var(--p-ink, #0E0E0E)",
  ink2:   "var(--p-ink2, #3D3D3D)",
  ink3:   "var(--p-ink3, #727272)",
  border: "var(--p-border, #E4E4E4)",
};

/* ══════════════════════════════════════════════════════════════════════════════
   DASHBOARD PAGE
══════════════════════════════════════════════════════════════════════════════ */
export function DashboardPage() {
  usePageTitle("Dashboard | SquadCode");
  const { showToast } = useToast();
  const { showConfirm } = useDialog();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { user } = useUser();
  const api = useMemo(() => createApiClient(() => getToken()), [getToken]);
  const { plan } = usePlan();

  const selectedSquadId  = useSquadStore((s) => s.selectedSquadId);
  const setSelectedSquadId = useSquadStore((s) => s.setSelectedSquadId);
  const mySquads         = useSquadStore((s) => s.mySquads);
  const setMySquads      = useSquadStore((s) => s.setMySquads);

  const [dashboard,  setDashboard]  = useState<DashboardPayload | null>(null);
  const [feed,       setFeed]       = useState<FeedItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [squadAction, setSquadAction] = useState<"leave" | "delete" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiRec, setAiRec] = useState<{
    problemName: string; platform: string; difficulty: string;
    reason: string; problemUrl?: string;
  } | null>(null);
  const [aiLimitReached, setAiLimitReached] = useState(false);

  const [sheetModal, setSheetModal] = useState<{
    open: boolean; sheets: any[]; selectedId: string;
    newTitle: string; loading: boolean;
  }>({ open: false, sheets: [], selectedId: "new", newTitle: "", loading: false });

  const [copied, setCopied] = useState(false);

  // ── Load squads ──────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);
    api.get("/squads/mine")
      .then((r) => {
        if (!alive) return;
        const squads = (r.data?.squads ?? []) as MySquad[];
        setMySquads(squads);
        const preferred = (selectedSquadId && squads.find((s) => s.id === selectedSquadId)?.id) ?? squads[0]?.id ?? null;
        if (preferred !== selectedSquadId) setSelectedSquadId(preferred);
      })
      .catch((e: unknown) => { if (alive) { setError(errorMessage(e)); setMySquads([]); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, setSelectedSquadId]);

  // ── Load dashboard + feed ────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    if (!selectedSquadId) { setDashboard(null); setFeed([]); return; }
    setError(null); setDashboard(null);
    Promise.all([
      api.get(`/squads/${selectedSquadId}/dashboard`),
      api.get(`/feed/${selectedSquadId}`),
    ]).then(([d, f]) => {
      if (!alive) return;
      setDashboard(d.data as DashboardPayload);
      setFeed((f.data?.items ?? []) as FeedItem[]);
      void api.post(`/platformData/refresh/${selectedSquadId}`).catch(() => {});
    }).catch((e: unknown) => { if (alive) setError(errorMessage(e)); });
    return () => { alive = false; };
  }, [api, selectedSquadId, retryCount]);

  // ── Feed polling ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedSquadId) return;
    const t = setInterval(async () => {
      try {
        const token = await getToken();
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
        const r = await fetch(`${apiBaseUrl()}/api/feed/${selectedSquadId}`, { headers });
        if (r.ok) { const d = await r.json() as { items?: FeedItem[] }; setFeed(d.items ?? []); }
      } catch { /* ignore */ }
    }, 30_000);
    return () => clearInterval(t);
  }, [api, selectedSquadId, getToken]);

  // ── Actions ──────────────────────────────────────────────────────────────
  async function triggerRefresh() {
    if (!selectedSquadId) return;
    setRefreshing(true);
    try {
      await api.post(`/platformData/refresh/${selectedSquadId}`);
      const [d, f] = await Promise.all([
        api.get(`/squads/${selectedSquadId}/dashboard`),
        api.get(`/feed/${selectedSquadId}`),
      ]);
      setDashboard(d.data as DashboardPayload);
      setFeed(((f.data as { items?: FeedItem[] }).items ?? []));
    } catch (e: unknown) { setError(errorMessage(e)); }
    finally { setRefreshing(false); }
  }

  async function removeCurrentSquad(action: "leave" | "delete") {
    if (!selectedSquadId) return;
    const sq = mySquads.find((s) => s.id === selectedSquadId);
    const msg = action === "delete"
      ? `Delete "${sq?.name ?? "this squad"}" for every member? Cannot be undone.`
      : `Leave "${sq?.name ?? "this squad"}"?`;
    showConfirm(action === "delete" ? "⚠️ Delete Squad" : "Leave Squad", msg, async () => {
      setSquadAction(action); setActionError(null);
      try {
        if (action === "delete") await api.delete(`/squads/${selectedSquadId}`);
        else await api.delete(`/squads/${selectedSquadId}/members/me`);
        const next = mySquads.filter((s) => s.id !== selectedSquadId);
        setMySquads(next); setSelectedSquadId(next[0]?.id ?? null);
        setDashboard(null); setFeed([]);
      } catch (e: unknown) { setActionError(errorMessage(e)); }
      finally { setSquadAction(null); }
    });
  }

  async function fetchAiRecommendation() {
    if (!selectedSquadId) return;
    setAiLoading(true); setAiLimitReached(false);
    try {
      const r = await api.post(`/ai/${selectedSquadId}/recommend`);
      setAiRec(r.data.recommendation);
    } catch (e: any) {
      if (e.response?.status === 403) setAiLimitReached(true);
      else showToast(errorMessage(e), "error");
    } finally { setAiLoading(false); }
  }

  // ── Early returns ────────────────────────────────────────────────────────
  if (loading) return <PageSkeleton />;
  if (error)   return <ErrorState error={error} onRetry={() => setRetryCount((c) => c + 1)} />;

  if (mySquads.length === 0) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        minHeight: "60vh", textAlign: "center", padding: 32,
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: 20,
          background: P.lime, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 32, marginBottom: 24,
        }}>🚀</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: P.ink, marginBottom: 8 }}>Welcome to SquadCode!</h2>
        <p style={{ fontSize: 14, color: P.ink3, maxWidth: 400, lineHeight: 1.6, marginBottom: 28 }}>
          You aren't in any squads yet. Create or join one to start tracking progress together.
        </p>
        <Link
          to="/onboarding"
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "12px 24px", borderRadius: 10,
            background: P.lime, color: P.ink, fontWeight: 700, fontSize: 14,
            textDecoration: "none",
          }}
        >
          <Plus size={16} /> Create or Join a Squad
        </Link>
      </div>
    );
  }

  const currentSquad      = mySquads.find((s) => s.id === selectedSquadId);
  const squadName         = dashboard?.squad?.name ?? currentSquad?.name ?? "Squad";
  const isAdmin           = currentSquad?.role === "admin";
  const inviteCode        = dashboard?.squad?.inviteCode ?? "—";
  const memberCount       = dashboard?.members.length ?? 0;
  const myMember          = dashboard?.members.find((m) => m.user.email === user?.primaryEmailAddress?.emailAddress);
  const myConns           = dashboard?.connections.filter((c) => c.userId === myMember?.user.id) ?? [];
  const needsConnections  = myMember && myConns.length === 0;

  // streak
  const streak = (() => {
    if (!feed.length) return 0;
    const days = new Set(feed.map((i) => new Date(i.createdAt).toISOString().split("T")[0]));
    let s = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      if (days.has(d.toISOString().split("T")[0])) s++;
      else if (i !== 0) break;
    }
    return s;
  })();

  // top problem solvers leaderboard
  const solveLeaderboard = (() => {
    const counts: Record<string, { name: string; count: number; img?: string | null }> = {};
    for (const f of feed) {
      if (f.activityType === "problem_solved") {
        const m = dashboard?.members.find((m) => m.user.id === f.user.id);
        const name = m?.nickname ?? f.user.username;
        if (!counts[f.user.id]) counts[f.user.id] = { name, count: 0, img: f.user.profileImageUrl };
        counts[f.user.id].count++;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3);
  })();


  /* ── JSX ──────────────────────────────────────────────────────────────── */
  return (
    <div>

      <style>{`
        .db-card {
          background: var(--p-white, #fff);
          border: 1px solid var(--p-border, #E4E4E4);
          border-radius: 16px;
          padding: 20px 22px;
        }
        .db-card-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .1em;
          text-transform: uppercase;
          color: var(--p-ink3, #727272);
          margin-bottom: 6px;
        }
        .db-stat-big {
          font-size: 2.4rem;
          font-weight: 900;
          letter-spacing: -.03em;
          color: var(--p-ink, #0E0E0E);
          line-height: 1;
        }
        .db-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 9px;
          border: 1px solid var(--p-border, #E4E4E4);
          background: var(--p-white, #fff);
          font-size: 12.5px;
          font-weight: 700;
          color: var(--p-ink2, #3D3D3D);
          cursor: pointer;
          transition: background .15s, border-color .15s;
          white-space: nowrap;
        }
        .db-action-btn:hover { background: var(--p-grey, #F3F3F3); border-color: #C4C4C4; }
        .db-action-btn:disabled { opacity: .5; cursor: default; }
        .db-action-btn.primary { background: var(--p-lime, #C9FE6E); border-color: var(--p-lime, #C9FE6E); color: var(--p-ink, #0E0E0E); }
        .db-action-btn.primary:hover { background: #b8f050; }
        .db-action-btn.danger { background: #FFF0F0; border-color: #FFBABA; color: #CC0000; }
        .db-action-btn.danger:hover { background: #FFE0E0; }
        .db-section-title {
          font-size: 14px;
          font-weight: 800;
          color: var(--p-ink, #0E0E0E);
          margin-bottom: 14px;
          letter-spacing: -.01em;
        }
        .db-platform-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 10.5px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 6px;
          letter-spacing: .04em;
        }
        .db-feed-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 10px 0;
          border-bottom: 1px solid var(--p-border, #E4E4E4);
        }
        .db-feed-item:last-child { border-bottom: none; padding-bottom: 0; }
        .db-member-row {
          background: var(--p-grey, #F3F3F3);
          border-radius: 12px;
          padding: 14px 16px;
        }
        @media (max-width: 768px) {
          .db-grid-2 { grid-template-columns: 1fr !important; }
          .db-grid-3 { grid-template-columns: 1fr 1fr !important; }
          .db-grid-4 { grid-template-columns: 1fr 1fr !important; }
          .db-stats-hero { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: P.ink, letterSpacing: "-.02em", marginBottom: 4 }}>
            {squadName}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: P.ink3, fontWeight: 600 }}>Invite code:</span>
            <code style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 12.5, fontWeight: 700,
              background: P.grey, padding: "2px 8px",
              borderRadius: 6, color: P.ink,
            }}>{inviteCode}</code>
            <button
              onClick={() => { navigator.clipboard.writeText(inviteCode); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: copied ? "#71CFA3" : P.ink3, display: "flex" }}
            >
              {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={fetchAiRecommendation}
            disabled={aiLoading}
            className="db-action-btn primary"
            id="ai-recommend-btn"
          >
            <Sparkles size={13} />
            {aiLoading ? "Analyzing…" : "AI Recommend"}
          </button>
          <button
            onClick={triggerRefresh}
            disabled={refreshing}
            className="db-action-btn"
            id="refresh-btn"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          <button
            onClick={() => void removeCurrentSquad("leave")}
            disabled={squadAction !== null}
            className="db-action-btn"
          >
            {squadAction === "leave" ? "Leaving…" : "Leave Squad"}
          </button>
          {isAdmin && (
            <button
              onClick={() => void removeCurrentSquad("delete")}
              disabled={squadAction !== null}
              className="db-action-btn danger"
            >
              {squadAction === "delete" ? "Deleting…" : "Delete Squad"}
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 10, background: "#FFF0F0", border: "1px solid #FFBABA", fontSize: 13, color: "#CC0000", fontWeight: 600 }}>
          {actionError}
        </div>
      )}

      {/* ── Connect platforms banner ─────────────────────────────────────── */}
      {needsConnections && (
        <div style={{
          marginBottom: 20, padding: "16px 20px", borderRadius: 14,
          background: P.sky, border: `1px solid #A0D8F0`,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AlertCircle size={18} style={{ color: "#1a6f9f", flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: P.ink }}>Connect your platforms</div>
              <div style={{ fontSize: 12, color: "#1a6f9f" }}>Link Codeforces, LeetCode or GitHub to see your stats.</div>
            </div>
          </div>
          <Link
            to="/settings/connections"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 9, background: P.white,
              border: "1px solid #A0D8F0", fontWeight: 700, fontSize: 12.5,
              color: P.ink, textDecoration: "none",
            }}
          >
            Connect <ExternalLink size={12} />
          </Link>
        </div>
      )}

      {/* ── AI Limit reached ─────────────────────────────────────────────── */}
      {aiLimitReached && (
        <div style={{
          marginBottom: 20, padding: "16px 20px", borderRadius: 14,
          background: "#FFF5F5", border: "1px solid #FFBABA",
          display: "flex", alignItems: "flex-start", gap: 12, position: "relative",
        }}>
          <button onClick={() => setAiLimitReached(false)} style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", cursor: "pointer", color: P.ink3 }}>
            <X size={15} />
          </button>
          <div style={{ fontSize: 22, flexShrink: 0 }}>🛑</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#CC0000", marginBottom: 4 }}>AI Limit Reached</div>
            <p style={{ fontSize: 12.5, color: "#993333", marginBottom: 10 }}>
              You've used all AI recommendations on the Free plan. Upgrade to Pro for unlimited access.
            </p>
            <button onClick={() => navigate("/pricing")} className="db-action-btn primary" style={{ fontSize: 12 }}>
              <Zap size={12} /> Upgrade to Pro
            </button>
          </div>
        </div>
      )}

      {/* ── AI Recommendation card ────────────────────────────────────────── */}
      {aiRec && !aiLimitReached && (
        <div style={{
          marginBottom: 20, padding: "20px 22px", borderRadius: 14,
          background: P.white, border: `1px solid ${P.lime}`,
          boxShadow: `0 0 0 4px ${P.lime}22`,
          position: "relative",
        }}>
          <button onClick={() => setAiRec(null)} style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", cursor: "pointer", color: P.ink3 }}>
            <X size={15} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Sparkles size={16} style={{ color: P.ink }} />
            <span style={{ fontSize: 14, fontWeight: 800, color: P.ink }}>AI Squad Recommendation</span>
          </div>
          <p style={{ fontSize: 13, color: P.ink2, lineHeight: 1.6, marginBottom: 14 }}>{aiRec.reason}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: P.ink }}>{aiRec.problemName}</span>
            <span style={{ background: P.grey, padding: "3px 10px", borderRadius: 6, fontSize: 11.5, fontWeight: 700, color: P.ink2 }}>
              {aiRec.platform}
            </span>
            <span style={{
              background:
                aiRec.difficulty === "Easy"   ? "#DCFCE7" :
                aiRec.difficulty === "Medium" ? "#FEF9C3" : "#FFE4E6",
              color:
                aiRec.difficulty === "Easy"   ? "#166534" :
                aiRec.difficulty === "Medium" ? "#854D0E" : "#9F1239",
              padding: "3px 10px", borderRadius: 6, fontSize: 11.5, fontWeight: 700,
            }}>
              {aiRec.difficulty}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a
              href={aiRec.problemUrl ?? (aiRec.platform === "LeetCode"
                ? `https://leetcode.com/problems/${aiRec.problemName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}/`
                : `https://codeforces.com/problemset`)}
              target="_blank" rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "9px 16px", borderRadius: 9,
                background: P.lime, color: P.ink, fontWeight: 700, fontSize: 13,
                textDecoration: "none",
              }}
            >
              <ExternalLink size={13} /> Solve Problem
            </a>
            <button
              onClick={async () => {
                try {
                  const r = await api.get(`/sheets/${selectedSquadId}`);
                  const sheets = r.data.sheets ?? r.data;
                  setSheetModal({ open: true, sheets, selectedId: sheets.length > 0 ? sheets[0].id : "new", newTitle: "", loading: false });
                } catch { showToast("Failed to load sheets", "error"); }
              }}
              className="db-action-btn"
            >
              📋 Add to Sheet
            </button>
            <button onClick={fetchAiRecommendation} disabled={aiLoading} className="db-action-btn">
              🔄 New Suggestion
            </button>
          </div>
          {plan === "free" && (
            <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, background: P.grey }}>
              <span style={{ fontSize: 11.5, color: P.ink3 }}>Limited recommendations on Free plan.</span>
              <button onClick={() => navigate("/pricing")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11.5, fontWeight: 700, color: "#3B82F6" }}>
                Upgrade for unlimited
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── STATS HERO ROW ───────────────────────────────────────────────── */}
      <div className="db-stats-hero" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {/* Members */}
        <div className="db-card">
          <div className="db-card-label">Members</div>
          <div className="db-stat-big">{memberCount}</div>
          <div style={{ fontSize: 11.5, color: P.ink3, marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
            <Users size={12} /> in your squad
          </div>
        </div>

        {/* Problems solved (from feed) */}
        <div className="db-card" style={{ borderColor: P.lime, background: P.lime }}>
          <div className="db-card-label">Problems Solved</div>
          <div className="db-stat-big">{feed.filter((f) => f.activityType === "problem_solved").length}</div>
          <div style={{ fontSize: 11.5, color: P.ink2, marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
            <Code2 size={12} /> this session
          </div>
        </div>

        {/* Streak */}
        <div className="db-card" style={{ borderColor: P.mint }}>
          <div className="db-card-label">Squad Streak</div>
          <div className="db-stat-big" style={{ color: "#1a9660" }}>{streak}</div>
          <div style={{ fontSize: 11.5, color: P.ink3, marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
            <Flame size={12} style={{ color: "#ff6b35" }} /> consecutive days
          </div>
        </div>

        {/* Activity */}
        <div className="db-card" style={{ borderColor: P.sky }}>
          <div className="db-card-label">Total Activity</div>
          <div className="db-stat-big" style={{ color: "#1a6f9f" }}>{feed.length}</div>
          <div style={{ fontSize: 11.5, color: P.ink3, marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
            <TrendingUp size={12} /> events tracked
          </div>
        </div>
      </div>

      {/* ── TWO-COLUMN LAYOUT ────────────────────────────────────────────── */}
      <div className="db-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>

        {/* LEFT: Members */}
        <div className="db-card" style={{ padding: "20px 20px" }}>

          <div className="db-section-title">Squad Members</div>
          {dashboard ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {dashboard.members.map((m) => (
                <MemberRow
                  key={m.id}
                  member={m}
                  connections={dashboard.connections}
                  caches={dashboard.caches}
                  isMe={m.user.email === user?.primaryEmailAddress?.emailAddress}
                  squadId={dashboard.squad?.id}
                  api={api}
                  onNicknameUpdated={triggerRefresh}
                />
              ))}
            </div>
          ) : (
            <div style={{ color: P.ink3, fontSize: 13 }}>No squad selected.</div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Top solvers */}
          {solveLeaderboard.length > 0 && (
            <div className="db-card">
              <div className="db-section-title">🏆 Top Solvers</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {solveLeaderboard.map(([uid, data], i) => (
                  <div key={uid} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%",
                      background: i === 0 ? P.lime : i === 1 ? P.sky : P.mint,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9, fontWeight: 900, flexShrink: 0,
                    }}>
                      {i + 1}
                    </div>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: P.grey, display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 800, color: P.ink, flexShrink: 0,
                    }}>
                      {data.name[0]?.toUpperCase()}
                    </div>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: P.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {data.name}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: P.ink2 }}>{data.count} solved</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick links */}
          <div className="db-card">
            <div className="db-section-title">Quick Links</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { label: "Squad Challenges", to: "/challenges", color: P.lime, icon: "⚔️" },
                { label: "Practice Sheets",  to: "/sheets",     color: P.sky,  icon: "📋" },
                { label: "Code Playground",  to: "/playground", color: P.mint, icon: "💻" },
                { label: "Contest Calendar", to: "/calendar",   color: P.grey, icon: "📅" },
              ].map((q) => (
                <button
                  key={q.to}
                  onClick={() => navigate(q.to)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 12px", borderRadius: 10, background: P.grey,
                    border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                    color: P.ink, textAlign: "left", transition: "background .15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = q.color)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = P.grey)}
                >
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{q.icon}</span>
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── ACTIVITY FEED ────────────────────────────────────────────────── */}
      <div className="db-card" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div className="db-section-title" style={{ margin: 0 }}>Activity Feed</div>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            fontSize: 11.5, fontWeight: 700, color: "#16a34a",
            background: "#DCFCE7", padding: "3px 9px", borderRadius: 999,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#16a34a", flexShrink: 0 }} />
            Live
          </span>
        </div>

        {feed.length === 0 ? (
          <div style={{ padding: "24px 0", textAlign: "center", color: P.ink3, fontSize: 13, fontWeight: 600 }}>
            No recent activity — start solving! 🎯
          </div>
        ) : (
          <div>
            {feed.slice(0, 30).map((item) => {
              const member = dashboard?.members.find((m) => m.user.id === item.user.id);
              const name   = member?.nickname ?? item.user.username;
              const color  = item.platform === "codeforces" ? { bg: "#FFF0F0", c: "#CC0000" }
                           : item.platform === "leetcode"   ? { bg: "#FFF8E7", c: "#B45309" }
                           : { bg: "#F0F9FF", c: "#0369A1" };
              return (
                <div key={item.id} className="db-feed-item">
                  {item.user.profileImageUrl ? (
                    <img src={item.user.profileImageUrl} alt={name} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: P.grey, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, color: P.ink, flexShrink: 0 }}>
                      {(name?.[0] ?? "?").toUpperCase()}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: P.ink, lineHeight: 1.5 }}>
                      <span style={{ fontWeight: 700 }}>{name}</span>{" "}
                      <span style={{ color: P.ink2 }}>{item.description}</span>
                    </div>
                    <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ ...color, padding: "1px 7px", borderRadius: 4, fontSize: 10.5, fontWeight: 700, background: color.bg, color: color.c }}>
                        {item.platform}
                      </span>
                      <span style={{ fontSize: 11, color: P.ink3, fontWeight: 500 }}>{timeAgo(item.createdAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── SHEET MODAL ─────────────────────────────────────────────────── */}
      {sheetModal.open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.25)", padding: 16 }}>
          <div style={{ width: "100%", maxWidth: 420, background: P.white, borderRadius: 18, border: `1px solid ${P.border}`, boxShadow: "0 24px 60px rgba(0,0,0,0.12)", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: `1px solid ${P.border}` }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: P.ink }}>Add to Sheet</span>
              <button onClick={() => setSheetModal((s) => ({ ...s, open: false }))} style={{ background: "none", border: "none", cursor: "pointer", color: P.ink3 }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: "20px" }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: P.ink3, marginBottom: 6 }}>Select Sheet</label>
              <select
                value={sheetModal.selectedId}
                onChange={(e) => setSheetModal((s) => ({ ...s, selectedId: e.target.value }))}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: `1px solid ${P.border}`, background: P.grey, fontSize: 13, fontWeight: 600, color: P.ink, outline: "none", marginBottom: 14 }}
              >
                {sheetModal.sheets.map((s: any) => <option key={s.id} value={s.id}>{s.title}</option>)}
                <option value="new">+ Create New Sheet</option>
              </select>
              {sheetModal.selectedId === "new" && (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: P.ink3, marginBottom: 6 }}>New Sheet Name</label>
                  <input
                    type="text"
                    value={sheetModal.newTitle}
                    onChange={(e) => setSheetModal((s) => ({ ...s, newTitle: e.target.value }))}
                    placeholder="e.g. DP Practice"
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: `1px solid ${P.border}`, background: P.grey, fontSize: 13, fontWeight: 600, color: P.ink, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", padding: "14px 20px", borderTop: `1px solid ${P.border}`, background: P.grey }}>
              <button onClick={() => setSheetModal((s) => ({ ...s, open: false }))} className="db-action-btn">Cancel</button>
              <button
                disabled={sheetModal.loading || (sheetModal.selectedId === "new" && !sheetModal.newTitle.trim())}
                onClick={async () => {
                  if (!aiRec) return;
                  setSheetModal((s) => ({ ...s, loading: true }));
                  try {
                    let targetId = sheetModal.selectedId, targetTitle = "";
                    if (targetId === "new") {
                      const r = await api.post("/sheets", { squadId: selectedSquadId, title: sheetModal.newTitle.trim(), dueDate: null });
                      targetId = r.data.sheet.id; targetTitle = r.data.sheet.title;
                    } else {
                      targetTitle = sheetModal.sheets.find((s: any) => s.id === targetId)?.title || "Sheet";
                    }
                    await api.post(`/sheets/${targetId}/problems`, {
                      problemName: aiRec.problemName, platform: aiRec.platform,
                      problemUrl: aiRec.problemUrl ?? (aiRec.platform === "LeetCode"
                        ? `https://leetcode.com/problems/${aiRec.problemName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}/`
                        : `https://codeforces.com/problemset`),
                      difficulty: aiRec.difficulty.toLowerCase(),
                    });
                    showToast(`Added "${aiRec.problemName}" to "${targetTitle}"!`, "success");
                    setSheetModal((s) => ({ ...s, open: false }));
                  } catch { showToast("Failed to add problem.", "error"); }
                  finally { setSheetModal((s) => ({ ...s, loading: false })); }
                }}
                className="db-action-btn primary"
                style={{ opacity: (sheetModal.loading || (sheetModal.selectedId === "new" && !sheetModal.newTitle.trim())) ? .5 : 1 }}
              >
                {sheetModal.loading ? "Adding…" : "Add to Sheet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   MEMBER ROW
══════════════════════════════════════════════════════════════════════════════ */
function MemberRow(props: {
  member: SquadMember; connections: Connection[]; caches: Cache[];
  isMe?: boolean; squadId?: string; api?: any; onNicknameUpdated?: () => void;
}) {
  const { showToast } = useToast();
  const conns = props.connections.filter((c) => c.userId === props.member.user.id);
  const caches = props.caches.filter((c) => c.userId === props.member.user.id);

  const cf = asObject(caches.find((c) => c.platform === "codeforces")?.data);
  const lc = asObject(caches.find((c) => c.platform === "leetcode")?.data);
  const gh = asObject(caches.find((c) => c.platform === "github")?.data);
  const cfC = conns.find((c) => c.platform === "codeforces");
  const lcC = conns.find((c) => c.platform === "leetcode");
  const ghC = conns.find((c) => c.platform === "github");

  const [editing, setEditing] = useState(false);
  const [nickInput, setNickInput] = useState(props.member.nickname ?? "");
  const [saving, setSaving] = useState(false);

  async function saveNickname() {
    if (!props.api || !props.squadId) return;
    setSaving(true);
    try {
      await props.api.patch(`/squads/${props.squadId}/members/me/nickname`, { nickname: nickInput.trim() || null });
      setEditing(false);
      props.onNicknameUpdated?.();
    } catch { showToast("Failed to update nickname", "error"); }
    finally { setSaving(false); }
  }

  const displayName = props.member.nickname ?? props.member.user.username;

  const stats = [
    { label: "CF Rating", value: typeof cf?.rating === "number" ? String(cf.rating) : cfC?.verified ? "—" : "—", sub: cfC?.verified ? cfC.username : "not linked", accent: P.lime, Icon: Award },
    { label: "LC Rating", value: typeof lc?.contestRating === "number" ? String(Math.round(lc.contestRating as number)) : "—", sub: lcC?.verified ? lcC.username : "not linked", accent: P.sky, Icon: TrendingUp },
    { label: "LC Solved", value: typeof lc?.totalSolved === "number" ? String(lc.totalSolved) : "—", sub: lcC?.verified ? lcC.username : "not linked", accent: P.mint, Icon: Code2 },
    { label: "GH Contribs", value: typeof gh?.totalContributionsThisYear === "number" ? String(gh.totalContributionsThisYear) : "—", sub: ghC?.verified ? ghC.username : "not linked", accent: "#E5E7EB", Icon: GitBranch },
  ];

  return (
    <CometCard className="db-member-card-wrapper" glowColor="rgba(255, 255, 255, 0.12)">
      <div className="db-member-row" style={{
        background: P.white,
        border: `1px solid ${P.border}`,
        borderRadius: 16,
        padding: "16px 18px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
        position: "relative",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              background: `linear-gradient(135deg, ${P.lime}, ${P.mint})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 15, fontWeight: 900, color: P.ink, flexShrink: 0,
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}>
              {displayName[0]?.toUpperCase()}
            </div>
            <div>
              {editing ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="text"
                    value={nickInput}
                    onChange={(e) => setNickInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") void saveNickname(); if (e.key === "Escape") setEditing(false); }}
                    style={{ padding: "4px 8px", borderRadius: 6, border: `1px solid ${P.border}`, fontSize: 13, fontWeight: 600, outline: "none", width: 120 }}
                    autoFocus
                  />
                  <button onClick={() => void saveNickname()} disabled={saving} style={{ padding: "4px 10px", borderRadius: 6, background: P.lime, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                    {saving ? "…" : "Save"}
                  </button>
                  <button onClick={() => setEditing(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: P.ink3 }}>Cancel</button>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 800, color: P.ink }}>{displayName}</span>
                  {props.isMe && (
                    <button onClick={() => { setNickInput(props.member.nickname ?? ""); setEditing(true); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: P.ink3, textDecoration: "underline" }}>
                      edit
                    </button>
                  )}
                </div>
              )}
              <div style={{ fontSize: 11.5, color: P.ink3 }}>@{props.member.user.username}</div>
            </div>
          </div>
          <span style={{
            fontSize: 10.5, fontWeight: 800, padding: "3px 10px", borderRadius: 999,
            background: props.member.role === "admin" ? P.lime : P.grey,
            color: P.ink, letterSpacing: ".05em", textTransform: "uppercase",
            border: `1px solid ${props.member.role === "admin" ? P.lime : P.border}`,
          }}>
            {props.member.role}
          </span>
        </div>

        <div className="db-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
          {stats.map((s) => (
            <div key={s.label} style={{
              background: P.grey, borderRadius: 10, padding: "10px 10px",
              border: `1px solid ${P.border}`,
            }}>
              <div style={{ fontSize: 9.5, fontWeight: 800, color: P.ink3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                <s.Icon size={11} style={{ color: P.ink2 }} />
                {s.label}
              </div>
              <div style={{
                fontSize: 16.5, fontWeight: 900, color: s.value === "—" ? P.ink3 : P.ink,
                letterSpacing: "-.02em", lineHeight: 1,
              }}>{s.value}</div>
              <div style={{ fontSize: 10, color: P.ink3, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </CometCard>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */
function timeAgo(iso: string) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function asObject(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object") return null;
  return v as Record<string, unknown>;
}

function errorMessage(e: unknown) {
  if (axios.isAxiosError(e)) return (e.response?.data as { error?: string })?.error ?? e.message ?? "Request failed";
  if (e instanceof Error) return e.message;
  return "Something went wrong";
}

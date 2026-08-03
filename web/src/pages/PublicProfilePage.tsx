import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { usePageTitle } from "../lib/usePageTitle";
import { apiBaseUrl } from "../lib/api";
import { PlanBadge } from "../components/ui/PlanBadge";
import type { PlanTier } from "../lib/usePlan";
import * as htmlToImage from "html-to-image";

const API_URL = apiBaseUrl();

// ─── Types ────────────────────────────────────────────────────────────────────

type Connection = {
  platform: "codeforces" | "leetcode" | "github";
  username: string;
  verified: boolean;
};

type Cache = {
  platform: "codeforces" | "leetcode" | "github";
  data: unknown;
  fetchedAt: string;
};

type ProfileData = {
  username: string;
  memberSince: string;
  connections: Connection[];
  caches: Cache[];
  plan?: PlanTier;
  planTag?: { label: string; emoji: string; color: PlanTier; description: string };
  profileImageUrl?: string | null;
};

type CFData = {
  rating?: number;
  maxRating?: number;
  rank?: string;
  maxRank?: string;
};

type LCData = {
  totalSolved?: number;
  easySolved?: number;
  mediumSolved?: number;
  hardSolved?: number;
};

type GHData = {
  username?: string;
  publicRepos?: number;
  contributionsLast24h?: number;
  // legacy field aliases kept for backwards-compatible cache reads
  public_repos?: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCacheData<T>(caches: Cache[], platform: string): T | null {
  const cache = caches.find((c) => c.platform === platform);
  return cache ? (cache.data as T) : null;
}

function cfRatingColor(rating?: number): string {
  if (!rating) return "#94a3b8";
  if (rating >= 2400) return "#ef4444";
  if (rating >= 2100) return "#f97316";
  if (rating >= 1900) return "#a855f7";
  if (rating >= 1600) return "#3b82f6";
  if (rating >= 1400) return "#06b6d4";
  if (rating >= 1200) return "#22c55e";
  return "#64748b";
}

function cfRankLabel(rating?: number): string {
  if (!rating) return "unrated";
  if (rating >= 2400) return "Grandmaster";
  if (rating >= 2100) return "Master";
  if (rating >= 1900) return "Candidate Master";
  if (rating >= 1600) return "Expert";
  if (rating >= 1400) return "Specialist";
  if (rating >= 1200) return "Pupil";
  return "Newbie";
}

// ─── Brand SVG logos ──────────────────────────────────────────────────────────

function CFLogo({ className }: { className?: string }) {
  // Official Codeforces mark: three bars (blue / blue / red).
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-label="Codeforces"
      xmlns="http://www.w3.org/2000/svg">
      <path fill="#1F8ACB" d="M4.5 7.5C5.328 7.5 6 8.172 6 9v10.5c0 .828-.672 1.5-1.5 1.5h-3C.673 21 0 20.328 0 19.5V9c0-.828.673-1.5 1.5-1.5h3z" />
      <path fill="#1F8ACB" d="M13.5 3c.828 0 1.5.672 1.5 1.5v15c0 .828-.672 1.5-1.5 1.5h-3c-.827 0-1.5-.672-1.5-1.5v-15c0-.828.673-1.5 1.5-1.5h3z" />
      <path fill="#D32F2F" d="M22.5 10.5c.828 0 1.5.672 1.5 1.5v7.5c0 .828-.672 1.5-1.5 1.5h-3c-.828 0-1.5-.672-1.5-1.5V12c0-.828.672-1.5 1.5-1.5h3z" />
    </svg>
  );
}

function LCLogo({ className }: { className?: string }) {
  // Official LeetCode mark.
  return (
    <svg viewBox="0 0 24 24" fill="#FFA116" xmlns="http://www.w3.org/2000/svg"
      className={className} aria-label="LeetCode">
      <path d="M13.483 0a1.374 1.374 0 0 0-.961.411L7.116 5.826a1.373 1.373 0 0 0-.41.953c-.016.975.042 2.807.042 2.807a1.37 1.37 0 0 0 1.37 1.379h3.332a1.365 1.365 0 0 0 1.365-1.365v-3.33a1.37 1.37 0 0 0-1.37-1.37H9.278l4.4-4.39a1.375 1.375 0 0 0 0-1.943L13.483 0zm-6.15 8.163h-.007a1.37 1.37 0 0 0-.966.403L.405 14.52a1.375 1.375 0 0 0 0 1.943l5.955 5.955a1.375 1.375 0 0 0 1.943 0l4.39-4.4v2.166a1.37 1.37 0 0 0 1.37 1.37h3.332a1.37 1.37 0 0 0 1.365-1.37v-3.332a1.37 1.37 0 0 0-1.365-1.37h-2.166l4.39-4.4a1.375 1.375 0 0 0 0-1.943L14.07 3.315a1.375 1.375 0 0 0-1.943 0l-4.794 4.848zm-.017 8.35a1.37 1.37 0 0 0-.966.403l-3.33 3.33a1.375 1.375 0 0 0 0 1.943l1.943 1.943a1.375 1.375 0 0 0 1.943 0l3.33-3.33a1.375 1.375 0 0 0 0-1.943l-1.943-1.943a1.37 1.37 0 0 0-.977-.403z"/>
    </svg>
  );
}

function GHLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-label="GitHub">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

// ─── Share Modal ──────────────────────────────────────────────────────────────

function ShareModal({
  username: _username,
  profileUrl,
  onClose,
}: {
  username: string;
  profileUrl: string;
  onClose: () => void;
}) {
  const defaultMsg = `Check out my competitive programming profile on SquadCode! 🚀\nCF · LC · GH — all in one place.\n${profileUrl}`;
  const [msg, setMsg] = useState(defaultMsg);
  const [copied, setCopied] = useState(false);

  function copyToClipboard() {
    void navigator.clipboard.writeText(msg).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(msg)}`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-3xl border-2 border-ink-900 bg-surface-0 p-6 shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-ink-400 hover:bg-ink-100"
          aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
            strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <h2 className="font-display text-lg font-extrabold text-ink-900">Share your profile</h2>
        <p className="mt-1 text-xs text-ink-400">Customise the message below, then share anywhere.</p>

        <textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          rows={5}
          className="mt-4 w-full rounded-xl border-2 border-ink-200 bg-surface-1 px-3 py-2.5 text-sm text-ink-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 resize-none"
        />

        <div className="mt-4 flex flex-wrap gap-2">
          <a href={twitterUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl border-2 border-ink-900 bg-[#1da1f2] px-4 py-2 text-xs font-bold text-white shadow-pop-sm hover:opacity-90">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.259 5.629 5.905-5.629Zm-1.161 17.52h1.833L7.084 4.126H5.117Z" />
            </svg>
            Post on X
          </a>
          <a href={waUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl border-2 border-ink-900 bg-[#25d366] px-4 py-2 text-xs font-bold text-white shadow-pop-sm hover:opacity-90">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
            </svg>
            WhatsApp
          </a>
          <a href={linkedInUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl border-2 border-ink-900 bg-[#0077b5] px-4 py-2 text-xs font-bold text-white shadow-pop-sm hover:opacity-90">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
            LinkedIn
          </a>
          <button onClick={copyToClipboard}
            className="flex items-center gap-2 rounded-xl border-2 border-ink-900 bg-surface-2 px-4 py-2 text-xs font-bold text-ink-800 shadow-pop-sm hover:bg-ink-100">
            {copied ? "✅ Copied!" : "📋 Copy text"}
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <input readOnly value={profileUrl}
            className="flex-1 truncate rounded-lg border border-border bg-surface-1 px-3 py-1.5 text-xs font-mono text-ink-600" />
          <button onClick={() => void navigator.clipboard.writeText(profileUrl)}
            className="shrink-0 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-100">
            Copy link
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Profile Card ─────────────────────────────────────────────────────────────

function ProfileCard({
  profile,
  cf,
  lc,
  gh,
  cfConn,
  lcConn,
  ghConn,
}: {
  profile: ProfileData;
  cf: CFData | null;
  lc: LCData | null;
  gh: GHData | null;
  cfConn: Connection | undefined;
  lcConn: Connection | undefined;
  ghConn: Connection | undefined;
}) {
  const ratingColor = cfRatingColor(cf?.rating);
  const ghUsername = gh?.username ?? ghConn?.username;
  const ghContribs = gh?.contributionsLast24h;
  const ghRepos = gh?.publicRepos ?? gh?.public_repos;

  return (
    <div
      id="sc-profile-card"
      className="relative overflow-hidden rounded-3xl border-2 border-ink-900 bg-surface-0 shadow-pop"
    >
      {/* SquadCode watermark background */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.03]"
        aria-hidden="true"
      >
        <img src="/logo.png" alt="" className="h-64 w-64 object-contain" />
      </div>

      <div className="relative p-6 sm:p-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 border-ink-900 bg-gradient-to-br from-brand-500 to-purple-600 text-2xl font-extrabold text-white shadow-pop-sm overflow-hidden">
              {profile.profileImageUrl ? (
                <img crossOrigin="anonymous" src={profile.profileImageUrl} alt={profile.username} className="h-full w-full object-cover" />
              ) : (
                profile.username.slice(0, 2).toUpperCase()
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-2xl font-extrabold text-ink-900">
                  @{profile.username}
                </h1>
                {profile.plan && profile.plan !== "free" && (
                  <PlanBadge plan={profile.plan} tag={profile.planTag} size="sm" />
                )}
              </div>
              {/* <p className="mt-0.5 text-xs text-ink-400">SquadCode member since {memberYear}</p> */}
              {/* Platform badge row */}
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {cfConn && (
                  <a href={`https://codeforces.com/profile/${cfConn.username}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 pl-1 pr-2.5 py-0.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100">
                    <CFLogo className="h-4 w-4 rounded-sm" />
                    {cfConn.username}
                  </a>
                )}
                {lcConn && (
                  <a href={`https://leetcode.com/${lcConn.username}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 pl-1 pr-2.5 py-0.5 text-xs font-bold text-orange-700 transition hover:bg-orange-100">
                    <LCLogo className="h-4 w-4" />
                    {lcConn.username}
                  </a>
                )}
                {ghConn && (
                  <a href={`https://github.com/${ghConn.username}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-ink-50 pl-1 pr-2.5 py-0.5 text-xs font-bold text-ink-700 transition hover:bg-ink-100">
                    <GHLogo className="h-4 w-4" />
                    {ghConn.username}
                  </a>
                )}
                {profile.connections.length === 0 && (
                  <span className="text-xs italic text-ink-400">No platforms connected yet.</span>
                )}
              </div>
            </div>
          </div>

          {/* SquadCode brand stamp */}
          <div className="flex flex-col items-end gap-0.5 shrink-0">
            <div className="flex items-center gap-1.5 rounded-xl border border-border bg-surface-1 px-2.5 py-1.5">
              <img src="/logo.png" alt="SquadCode" className="h-4 w-4 rounded-md object-cover" />
              <span className="font-display text-xs font-extrabold text-ink-700">SquadCode</span>
            </div>
            <span className="text-[10px] text-ink-300">squadcode-saas.vercel.app</span>
          </div>
        </div>

        {/* ── Stats grid ─────────────────────────────────────────────────── */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">

          {/* Codeforces */}
          {cf && (
            <div className="rounded-2xl border-2 border-ink-900 bg-surface-1 p-5 shadow-pop">
              <div className="flex items-center gap-2">
                <CFLogo className="h-5 w-5 rounded" />
                <span className="text-xs font-bold uppercase tracking-wider text-ink-400">Codeforces</span>
              </div>
              <div className="mt-3 font-display text-4xl font-extrabold" style={{ color: ratingColor }}>
                {cf.rating ?? "—"}
              </div>
              <div className="mt-1 text-sm font-semibold" style={{ color: ratingColor }}>
                {cf.rank ?? cfRankLabel(cf.rating)}
              </div>
              {cf.maxRating && (
                <div className="mt-2 text-xs text-ink-400">
                  Peak: <span className="font-bold text-ink-600">{cf.maxRating}</span>
                  <span className="ml-1 text-ink-300">({cf.maxRank ?? cfRankLabel(cf.maxRating)})</span>
                </div>
              )}
            </div>
          )}

          {/* LeetCode */}
          {lc && (
            <div className="rounded-2xl border-2 border-ink-900 bg-surface-1 p-5 shadow-pop">
              <div className="flex items-center gap-2">
                <LCLogo className="h-5 w-5" />
                <span className="text-xs font-bold uppercase tracking-wider text-ink-400">LeetCode</span>
              </div>
              <div className="mt-3 font-display text-4xl font-extrabold text-[#FFA116]">
                {lc.totalSolved ?? "—"}
              </div>
              <div className="mt-1 text-sm text-ink-500">problems solved</div>
              {(lc.easySolved != null || lc.mediumSolved != null || lc.hardSolved != null) && (
                <div className="mt-3 flex gap-1.5 text-xs font-bold">
                  <span className="rounded-md bg-green-100 px-2 py-0.5 text-green-700">E {lc.easySolved ?? 0}</span>
                  <span className="rounded-md bg-orange-100 px-2 py-0.5 text-orange-700">M {lc.mediumSolved ?? 0}</span>
                  <span className="rounded-md bg-red-100 px-2 py-0.5 text-red-700">H {lc.hardSolved ?? 0}</span>
                </div>
              )}
            </div>
          )}

          {/* GitHub — full-width spanning card with inline heatmap */}
          {(gh || ghConn) && (
            <div className="sm:col-span-3 rounded-2xl border-2 border-ink-900 bg-surface-1 p-5 shadow-pop">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <GHLogo className="h-5 w-5 text-ink-800" />
                  <span className="text-xs font-bold uppercase tracking-wider text-ink-400">GitHub</span>
                  {ghUsername && (
                    <a href={`https://github.com/${ghUsername}`} target="_blank"
                      rel="noopener noreferrer"
                      className="ml-1 text-xs text-ink-400 hover:text-ink-700 hover:underline font-mono">
                      @{ghUsername}
                    </a>
                  )}
                </div>
                {/* Quick stat pills */}
                <div className="flex items-center gap-3">
                  {ghContribs != null && (
                    <div className="text-right">
                      <div className="font-display text-xl font-extrabold text-green-600 leading-none">{ghContribs}</div>
                      <div className="text-[10px] text-ink-400">last 24h</div>
                    </div>
                  )}
                  {ghRepos != null && (
                    <div className="text-right">
                      <div className="font-display text-xl font-extrabold text-ink-800 leading-none">{ghRepos}</div>
                      <div className="text-[10px] text-ink-400">repos</div>
                    </div>
                  )}
                </div>
              </div>
              {/* Inline heatmap or readme-stats image */}
              {ghUsername ? (
                <img
                  src={`https://github-readme-stats.vercel.app/api?username=${encodeURIComponent(ghUsername)}&show_icons=true&hide_border=true&count_private=true&theme=default&title_color=111827&text_color=374151&icon_color=22c55e&bg_color=ffffff00`}
                  alt={`${ghUsername}'s GitHub stats`}
                  className="w-full rounded-xl"
                  loading="lazy"
                />
              ) : null}
            </div>
          )}

          {!cf && !lc && !gh && !ghConn && (
            <div className="col-span-3 rounded-2xl border-2 border-border bg-surface-1 p-6 text-center">
              <p className="text-sm text-ink-400">Stats haven't loaded yet — check back soon.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  usePageTitle(username ? `${username} | SquadCode` : "Profile | SquadCode");

  const cardRef = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>;

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [downloadMsg, setDownloadMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    setNotFound(false);

    fetch(`${API_URL}/api/me/profile/${encodeURIComponent(username)}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json() as Promise<ProfileData>;
      })
      .then((data) => { if (data) setProfile(data); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [username]);

  const downloadCard = async () => {
    if (!cardRef.current) return;
    try {
      setDownloadMsg("Generating PNG image... Please wait.");
      
      const dataUrl = await htmlToImage.toPng(cardRef.current, { 
        pixelRatio: 2, 
        backgroundColor: '#ffffff',
        style: { transform: 'scale(1)' } 
      });
      
      const link = document.createElement("a");
      link.download = `${profile?.username || username}-squadcode-profile.png`;
      link.href = dataUrl;
      link.click();
      
      setDownloadMsg("✅ Image downloaded successfully!");
      setTimeout(() => setDownloadMsg(null), 3000);
    } catch (err: any) {
      console.error("Failed to generate image:", err);
      setDownloadMsg(`❌ Failed: ${err?.message || 'Unknown error'}`);
      setTimeout(() => setDownloadMsg(null), 5000);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-ink-400">
          <div className="h-10 w-10 rounded-full border-4 border-brand-500 border-t-transparent animate-spin" />
          <span className="text-sm font-bold">Loading profile…</span>
        </div>
      </main>
    );
  }

  if (notFound || !profile) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="text-5xl">🔍</div>
        <h1 className="font-display text-2xl font-bold text-ink-900">Profile not found</h1>
        <p className="text-ink-500 max-w-sm">
          <span className="font-mono text-brand-500">@{username}</span> hasn't joined SquadCode yet.
        </p>
        <Link to="/"
          className="mt-2 rounded-xl border-2 border-ink-900 bg-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-pop transition hover:bg-brand-400">
          Join SquadCode →
        </Link>
      </main>
    );
  }

  const cf = getCacheData<CFData>(profile.caches, "codeforces");
  const lc = getCacheData<LCData>(profile.caches, "leetcode");
  const gh = getCacheData<GHData>(profile.caches, "github");

  const cfConn = profile.connections.find((c) => c.platform === "codeforces");
  const lcConn = profile.connections.find((c) => c.platform === "leetcode");
  const ghConn = profile.connections.find((c) => c.platform === "github");

  const profileUrl = window.location.href;

  return (
    <div className="min-h-screen bg-surface-1">
      {/* Top bar */}
      <header className="border-b-2 border-border bg-surface-0">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="SquadCode" className="h-8 w-8 rounded-xl object-cover" />
            <span className="font-display font-bold text-ink-900">SquadCode</span>
          </Link>
          <Link to="/"
            className="rounded-xl border-2 border-ink-900 bg-brand-500 px-4 py-2 text-sm font-bold text-white shadow-pop-sm transition hover:bg-brand-400">
            Join free →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">

        {/* Action bar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-400">
            Public profile of{" "}
            <span className="font-bold text-ink-700">@{profile.username}</span>
          </p>
          <div className="flex gap-2">
            <button onClick={downloadCard}
              className="flex items-center gap-2 rounded-xl border-2 border-ink-900 bg-surface-0 px-4 py-2 text-sm font-bold text-ink-800 shadow-pop-sm transition hover:bg-ink-100">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download Card
            </button>
            <button onClick={() => setShowShare(true)}
              className="flex items-center gap-2 rounded-xl border-2 border-ink-900 bg-brand-500 px-4 py-2 text-sm font-bold text-white shadow-pop-sm transition hover:bg-brand-400">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              Share
            </button>
          </div>
        </div>

        {downloadMsg && (
          <div className="mb-4 rounded-xl border-2 border-green-500 bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-700">
            {downloadMsg}
          </div>
        )}

        {/* The profile card */}
        <div ref={cardRef}>
          <ProfileCard
            profile={profile}
            cf={cf}
            lc={lc}
            gh={gh}
            cfConn={cfConn}
            lcConn={lcConn}
            ghConn={ghConn}
          />
        </div>

        {/* CTA */}
        <div className="mt-8 rounded-2xl border-2 border-ink-900 bg-brand-500 p-6 shadow-pop text-center">
          <p className="font-display text-lg font-extrabold text-white">
            Track your progress with your squad
          </p>
          <p className="mt-1 text-sm text-brand-100">
            Join SquadCode free. Connect Codeforces, LeetCode &amp; GitHub. Grind together.
          </p>
          <Link to="/"
            className="mt-4 inline-block rounded-xl border-2 border-white bg-white px-6 py-2.5 text-sm font-extrabold text-brand-600 shadow-pop-sm transition hover:bg-brand-50">
            Create your profile →
          </Link>
        </div>
      </main>

      {showShare && (
        <ShareModal
          username={profile.username}
          profileUrl={profileUrl}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}

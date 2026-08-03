import { useCallback, useEffect, useMemo, useState } from "react";
import { usePageTitle } from "../lib/usePageTitle";
import { useAuth } from "@clerk/clerk-react";
import { createApiClient } from "../lib/api";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Platform = "codeforces" | "leetcode";

type Contest = {
  id: string;
  platform: Platform;
  name: string;
  url: string;
  startTime: number;   // unix ms
  durationMs: number;
};



/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];



function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(d: Date) {
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function formatDuration(ms: number) {
  const totalMin = Math.round(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function countdownText(ms: number): string {
  if (ms <= 0) return "Live now!";
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

function getCalendarDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const startDay = first.getDay();       // 0-6
  const daysInMonth = last.getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/* ------------------------------------------------------------------ */
/*  Main page component                                                */
/* ------------------------------------------------------------------ */

export function CalendarPage() {
  usePageTitle("Contest Calendar | SquadCode");

  const { getToken } = useAuth();
  const api = useMemo(() => createApiClient(() => getToken()), [getToken]);

  const today = new Date();
  const [viewYear, setViewYear]   = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const [contests, setContests]       = useState<Contest[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const [showCF, setShowCF] = useState(true);
  const [showLC, setShowLC] = useState(true);

  const [now, setNow] = useState(Date.now());

  // Tick every second when there's a contest within 1 hour, otherwise every 30s
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  /* ---- data fetching ---- */
  const loadContests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/data/contests');
      setContests(res.data.contests);
    } catch {
      setError("Failed to load contests. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { void loadContests(); }, [loadContests]);

  /* ---- filtered & derived data ---- */
  const filtered = useMemo(
    () =>
      contests.filter((c) => {
        if (c.platform === "codeforces" && !showCF) return false;
        if (c.platform === "leetcode" && !showLC) return false;
        return true;
      }),
    [contests, showCF, showLC],
  );

  const calendarDays = useMemo(() => getCalendarDays(viewYear, viewMonth), [viewYear, viewMonth]);

  // Map day-of-month → platforms with contests
  const contestDayMap = useMemo(() => {
    const map = new Map<number, Set<Platform>>();
    for (const c of filtered) {
      const d = new Date(c.startTime);
      if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
        const day = d.getDate();
        if (!map.has(day)) map.set(day, new Set());
        map.get(day)!.add(c.platform);
      }
    }
    return map;
  }, [filtered, viewYear, viewMonth]);

  // Upcoming contests (future only) for the list view
  const upcomingContests = useMemo(() => {
    const cutoff = now - 2 * 60 * 60 * 1000; // show contests that started up to 2h ago
    return filtered.filter((c) => c.startTime + c.durationMs > cutoff);
  }, [filtered, now]);

  // If a day is selected, highlight those contests
  const highlightedContests = useMemo(() => {
    if (selectedDay === null) return upcomingContests;
    return filtered.filter((c) => {
      const d = new Date(c.startTime);
      return d.getFullYear() === viewYear && d.getMonth() === viewMonth && d.getDate() === selectedDay;
    });
  }, [selectedDay, upcomingContests, filtered, viewYear, viewMonth]);

  /* ---- month navigation ---- */
  function prevMonth() {
    setSelectedDay(null);
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  }
  function nextMonth() {
    setSelectedDay(null);
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  }
  function goToday() {
    setSelectedDay(null);
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  }

  /* ---- render ---- */
  return (
    <div className="grid grid-cols-1 gap-6">
      {/* ======== HEADER CARD ======== */}
      <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Title */}
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden>📅</span>
            <h1 className="font-display text-lg font-bold">Contest Calendar</h1>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Platform toggles */}
            <button
              onClick={() => setShowCF((v) => !v)}
              className={`flex items-center gap-1.5 rounded-xl border-2 px-3 py-1.5 text-xs font-bold transition active:translate-y-0.5 ${
                showCF
                  ? "border-coral-500 bg-coral-500 text-white shadow-[0_2px_0_0_#cc4f39]"
                  : "border-ink-200 bg-surface-2 text-ink-400"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-current" />
              Codeforces
            </button>
            <button
              onClick={() => setShowLC((v) => !v)}
              className={`flex items-center gap-1.5 rounded-xl border-2 px-3 py-1.5 text-xs font-bold transition active:translate-y-0.5 ${
                showLC
                  ? "border-sun-500 bg-sun-400 text-ink-900 shadow-[0_2px_0_0_#cc7700]"
                  : "border-ink-200 bg-surface-2 text-ink-400"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-current" />
              LeetCode
            </button>

            {/* Refresh */}
            <button
              onClick={() => void loadContests()}
              disabled={loading}
              className="rounded-xl border-2 border-ink-900 bg-surface-0 px-3 py-1.5 text-xs font-bold text-ink-800 shadow-pop-sm transition active:translate-y-0.5 active:shadow-none hover:bg-ink-100 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-1">
                  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31 31" />
                  </svg>
                  Loading…
                </span>
              ) : (
                "↻ Refresh"
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-xl border-2 border-coral-300 bg-coral-300/10 px-4 py-2 text-sm font-bold text-coral-500">
            {error}
          </div>
        )}
      </div>

      {/* ======== CALENDAR + LIST ======== */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        {/* ---- Calendar Grid ---- */}
        <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card p-6">
          {/* Month navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={prevMonth}
              className="rounded-xl border-2 border-ink-900 bg-surface-0 px-3 py-1.5 text-sm font-bold text-ink-800 shadow-pop-sm transition active:translate-y-0.5 active:shadow-none hover:bg-ink-100"
              aria-label="Previous month"
            >
              ‹
            </button>
            <div className="flex items-center gap-3">
              <h2 className="font-display text-lg font-bold">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </h2>
              {(viewYear !== today.getFullYear() || viewMonth !== today.getMonth()) && (
                <button
                  onClick={goToday}
                  className="rounded-lg border border-brand-200 bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-600 transition hover:bg-brand-100"
                >
                  Today
                </button>
              )}
            </div>
            <button
              onClick={nextMonth}
              className="rounded-xl border-2 border-ink-900 bg-surface-0 px-3 py-1.5 text-sm font-bold text-ink-800 shadow-pop-sm transition active:translate-y-0.5 active:shadow-none hover:bg-ink-100"
              aria-label="Next month"
            >
              ›
            </button>
          </div>

          {/* Day headers */}
          <div className="mt-5 grid grid-cols-7 gap-1 text-center text-xs font-bold text-ink-400">
            {DAY_LABELS.map((d) => (
              <div key={d} className="py-1">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="mt-1 grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="aspect-square" />;
              }

              const isToday =
                viewYear === today.getFullYear() &&
                viewMonth === today.getMonth() &&
                day === today.getDate();

              const platforms = contestDayMap.get(day);
              const hasContests = !!platforms && platforms.size > 0;
              const isSelected = selectedDay === day;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`relative flex flex-col items-center justify-center rounded-xl border-2 aspect-square text-sm font-bold transition
                    ${isToday
                      ? "border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-500/30"
                      : isSelected
                        ? "border-brand-300 bg-brand-50 text-brand-600"
                        : hasContests
                          ? "border-border-strong bg-surface-1 text-ink-800 hover:border-brand-300 hover:bg-brand-50/50"
                          : "border-transparent bg-surface-2/60 text-ink-600 hover:bg-surface-2"
                    }
                  `}
                >
                  <span>{day}</span>
                  {/* Contest dot indicators */}
                  {hasContests && (
                    <div className="absolute bottom-1 flex gap-0.5">
                      {platforms!.has("codeforces") && (
                        <span className="h-1.5 w-1.5 rounded-full bg-coral-500" />
                      )}
                      {platforms!.has("leetcode") && (
                        <span className="h-1.5 w-1.5 rounded-full bg-sun-400" />
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center gap-4 text-xs text-ink-400">
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-coral-500" />
              Codeforces
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-sun-400" />
              LeetCode
            </div>
            <div className="flex items-center gap-1">
              <span className="h-3 w-3 rounded border-2 border-brand-500" />
              Today
            </div>
          </div>
        </div>

        {/* ---- Contest List (sidebar on lg) ---- */}
        <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-bold">
              {selectedDay !== null
                ? `Contests on ${MONTH_NAMES[viewMonth]} ${selectedDay}`
                : "Upcoming Contests"}
            </h2>
            {selectedDay !== null && (
              <button
                onClick={() => setSelectedDay(null)}
                className="rounded-lg border border-border bg-surface-2 px-2 py-0.5 text-xs font-bold text-ink-600 transition hover:bg-ink-100"
              >
                Show all
              </button>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-3 max-h-[520px] overflow-y-auto pr-1">
            {loading && (
              <div className="flex flex-col items-center gap-2 py-8 text-ink-400">
                <svg className="h-6 w-6 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31 31" />
                </svg>
                <span className="text-sm">Fetching contests…</span>
              </div>
            )}

            {!loading && highlightedContests.length === 0 && (
              <div className="rounded-xl border-2 border-border bg-surface-2 p-4 text-center text-sm text-ink-400">
                No contests found{selectedDay !== null ? " on this day" : ""}.
              </div>
            )}

            {!loading &&
              highlightedContests.map((c) => (
                <ContestCard key={c.id} contest={c} now={now} />
              ))}
          </div>
        </div>
      </div>

      {/* ======== FULL UPCOMING LIST (below calendar on all screens) ======== */}
      <div className="rounded-2xl border-2 border-border bg-surface-0 shadow-card p-6">
        <h2 className="font-display text-sm font-bold">All Upcoming Contests</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {!loading && upcomingContests.length === 0 && (
            <div className="col-span-full rounded-xl border-2 border-border bg-surface-2 p-4 text-center text-sm text-ink-400">
              No upcoming contests.
            </div>
          )}
          {!loading &&
            upcomingContests.map((c) => (
              <ContestCard key={`full-${c.id}`} contest={c} now={now} />
            ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Contest Card                                                        */
/* ------------------------------------------------------------------ */

function ContestCard({ contest, now }: { contest: Contest; now: number }) {
  const startDate = new Date(contest.startTime);
  const timeUntil = contest.startTime - now;
  const isLive = timeUntil <= 0 && now < contest.startTime + contest.durationMs;
  const isPast = now >= contest.startTime + contest.durationMs;

  const isCF = contest.platform === "codeforces";

  return (
    <a
      href={contest.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative flex flex-col gap-2 rounded-xl border-2 p-4 transition hover:-translate-y-0.5 ${
        isLive
          ? "border-mint-400 bg-mint-300/10 shadow-[0_2px_0_0_#1fb978]"
          : "border-border bg-surface-2 shadow-pop-sm hover:border-brand-300 hover:shadow-[0_3px_0_0_#cfc8f0]"
      }`}
    >
      {/* Platform badge & countdown */}
      <div className="flex items-center justify-between">
        <span
          className={`rounded-lg border-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
            isCF
              ? "border-coral-400 bg-coral-500 text-white"
              : "border-sun-400 bg-sun-400 text-ink-900"
          }`}
        >
          {isCF ? "CF" : "LC"}
        </span>

        {isLive && (
          <span className="flex items-center gap-1 text-xs font-bold text-mint-500">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-mint-500" />
            </span>
            LIVE
          </span>
        )}

        {!isLive && !isPast && (
          <span className="font-mono text-xs font-bold text-brand-600">
            {countdownText(timeUntil)}
          </span>
        )}

        {isPast && (
          <span className="text-xs font-bold text-ink-400">Ended</span>
        )}
      </div>

      {/* Name */}
      <div className="text-sm font-bold text-ink-800 group-hover:text-brand-600 transition line-clamp-2 leading-snug">
        {contest.name}
      </div>

      {/* Details */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-400">
        <span title={startDate.toISOString()}>
          {formatDate(startDate)} · {formatTime(startDate)}
        </span>
        <span>⏱ {formatDuration(contest.durationMs)}</span>
      </div>

      {/* External link icon */}
      <svg
        className="absolute right-3 top-3 h-3.5 w-3.5 text-ink-200 transition group-hover:text-brand-400"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
      </svg>
    </a>
  );
}

export default CalendarPage;

import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { UserButton, useAuth } from "@clerk/clerk-react";
import { useSquadStore } from "../store/squadStore";
import { useNotificationStore } from "../store/notificationStore";
import { useThreadPostNotifications } from "../lib/useThreadPostNotifications";

const navLinkClass =
  "rounded-xl px-3 py-2 text-sm font-bold text-ink-600 transition hover:bg-ink-100 hover:text-ink-800";

const activeClass = "bg-brand-500 text-white shadow-pop-sm";

export function AppShell() {
  const selectedSquadId = useSquadStore((s) => s.selectedSquadId);
  const { getToken, isSignedIn } = useAuth();
  const navigate = useNavigate();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const clearUnread = useNotificationStore((s) => s.clearUnread);

  useThreadPostNotifications(getToken, Boolean(isSignedIn));

  return (
    <div className="min-h-screen text-ink-800">
      <header className="sticky top-0 z-20 border-b-2 border-border bg-surface-1/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <NavLink
              to="/onboarding"
              className="group flex items-center gap-3 text-sm font-bold tracking-wide"
            >
              <img src="/logo.png" alt="SquadCode Logo" className="h-10 w-10 rounded-2xl object-cover border-2 border-ink-900 shadow-pop transition group-hover:-translate-y-0.5 group-hover:shadow-[0_6px_0_0_#cfc8f0]" />
              <span className="hidden sm:block">
                <span className="font-display block text-base leading-none text-ink-900">
                  SquadCode
                </span>
                <span className="mt-1 block text-xs font-normal text-ink-400">
                  Private squad workspace
                </span>
              </span>
            </NavLink>
            <nav className="hidden items-center gap-1 lg:flex">
              <NavLink
                to="/dashboard"
                className={({ isActive }) => `${navLinkClass} ${isActive ? activeClass : ""}`}
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/onboarding"
                className={({ isActive }) => `${navLinkClass} ${isActive ? activeClass : ""}`}
              >
                Squad Setup
              </NavLink>
              {selectedSquadId ? (
                <>
                  <NavLink
                    to="/threads"
                    className={({ isActive }) => `${navLinkClass} ${isActive ? activeClass : ""}`}
                  >
                    Threads
                  </NavLink>
                  <NavLink
                    to="/sheets"
                    className={({ isActive }) => `${navLinkClass} ${isActive ? activeClass : ""}`}
                  >
                    Sheets
                  </NavLink>
                  <NavLink
                    to="/leaderboard"
                    className={({ isActive }) => `${navLinkClass} ${isActive ? activeClass : ""}`}
                  >
                    Leaderboard
                  </NavLink>
                  <NavLink
                    to="/calendar"
                    className={({ isActive }) => `${navLinkClass} ${isActive ? activeClass : ""}`}
                  >
                    Calendar
                  </NavLink>
                  <NavLink
                    to="/playground"
                    className={({ isActive }) => `${navLinkClass} ${isActive ? activeClass : ""}`}
                  >
                    Playground
                  </NavLink>
                </>
              ) : null}
              <NavLink
                to="/settings/connections"
                className={({ isActive }) => `${navLinkClass} ${isActive ? activeClass : ""}`}
              >
                Connections
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                clearUnread();
                navigate("/threads");
              }}
              className="relative rounded-xl p-2 text-ink-600 transition hover:bg-ink-100 hover:text-ink-800"
              aria-label="Thread notifications"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full border-2 border-surface-1 bg-coral-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}
            </button>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 pb-3 sm:px-6 lg:hidden">
          {[
            ["/dashboard", "Dashboard"],
            ["/onboarding", "Setup"],
            ["/threads", "Threads"],
            ["/sheets", "Sheets"],
            ["/leaderboard", "Leaderboard"],
            ["/calendar", "Calendar"],
            ["/playground", "Playground"],
            ["/settings/connections", "Connections"]
          ].map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `${navLinkClass} whitespace-nowrap ${isActive ? activeClass : ""}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
        <Outlet />
      </main>
    </div>
  );
}

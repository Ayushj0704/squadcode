import { Outlet, NavLink } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";
import { useSquadStore } from "../store/squadStore";

const navLinkClass =
  "text-sm text-slate-300 hover:text-slate-100 transition";

export function AppShell() {
  const activeSquadId = useSquadStore((s) => s.activeSquadId);
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-900 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <NavLink
              to="/onboarding"
              className="text-sm font-semibold tracking-wide"
            >
              SquadCode
            </NavLink>
            <nav className="hidden sm:flex items-center gap-4">
              {activeSquadId ? (
                <NavLink
                  to={`/squad/${activeSquadId}`}
                  className={({ isActive }) =>
                    `${navLinkClass} ${isActive ? "text-slate-100" : ""}`
                  }
                >
                  Dashboard
                </NavLink>
              ) : null}
              <NavLink
                to="/onboarding"
                className={({ isActive }) =>
                  `${navLinkClass} ${isActive ? "text-slate-100" : ""}`
                }
              >
                Onboarding
              </NavLink>
              {activeSquadId ? (
                <>
                  <NavLink
                    to={`/squad/${activeSquadId}/threads`}
                    className={({ isActive }) =>
                      `${navLinkClass} ${isActive ? "text-slate-100" : ""}`
                    }
                  >
                    Threads
                  </NavLink>
                  <NavLink
                    to={`/squad/${activeSquadId}/sheets`}
                    className={({ isActive }) =>
                      `${navLinkClass} ${isActive ? "text-slate-100" : ""}`
                    }
                  >
                    Sheets
                  </NavLink>
                </>
              ) : null}
              <NavLink
                to="/settings/connections"
                className={({ isActive }) =>
                  `${navLinkClass} ${isActive ? "text-slate-100" : ""}`
                }
              >
                Connections
              </NavLink>
            </nav>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}

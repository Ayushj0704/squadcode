import { Outlet, NavLink } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";
import { useSquadStore } from "../store/squadStore";
import { useEffect, useState } from "react";
import { apiBaseUrl } from "../lib/api";

const navLinkClass =
  "text-sm text-slate-300 hover:text-slate-100 transition";

export function AppShell() {
  const activeSquadId = useSquadStore((s) => s.activeSquadId);
  const [notification, setNotification] = useState<{ id: string; message: string } | null>(null);

  useEffect(() => {
    if (!activeSquadId) return;

    // Use ws:// or wss:// based on the apiBaseUrl
    const url = new URL(apiBaseUrl());
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = "/api/ws";
    url.searchParams.set("squadId", activeSquadId);

    const ws = new WebSocket(url.toString());

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "PROBLEM_SOLVED") {
          const id = Math.random().toString();
          setNotification({
            id,
            message: `🎉 ${data.payload.username} solved Problem ${data.payload.problemIndex} (${data.payload.problemName})!`
          });
          setTimeout(() => {
            setNotification((prev) => (prev?.id === id ? null : prev));
          }, 5000);
        }
      } catch (err) {
        console.error("Failed to parse websocket message", err);
      }
    };

    return () => {
      ws.close();
    };
  }, [activeSquadId]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {notification && (
        <div className="fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg bg-green-900 border border-green-700 text-green-100 animate-bounce">
          {notification.message}
        </div>
      )}
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
                  <NavLink
                    to={`/squad/${activeSquadId}/contests`}
                    className={({ isActive }) =>
                      `${navLinkClass} ${isActive ? "text-slate-100" : ""}`
                    }
                  >
                    Contests
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

import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useSquadStore } from "../store/squadStore";
import { useNotificationStore } from "../store/notificationStore";
import { useThreadPostNotifications } from "../lib/useThreadPostNotifications";
import { usePushRegistration } from "../notification/usePushRegistration";
import { useState, useEffect, useRef, useMemo } from "react";
import { createApiClient } from "../lib/api";
import { FloatingDock } from "./ui/floating-dock";
import CardNav, { type CardNavItem } from "./CardNav";

// ── Icons ────────────────────────────────────────────────────────────────────
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  Trophy,
  Calendar,
  Terminal,
  Search,
  ChevronDown,
  Bell,
  Plus,
  Link as LinkIcon,
  User,
  Swords,
  BarChart3,
  MessageCircle,
  AtSign,
  CalendarClock,
  Zap,
  Users,
  X,
  ChevronRight,
  Sun,
  Moon,
} from "lucide-react";

// ── Palette ───────────────────────────────────────────────────────────────────
// #F3F3F3  surface / sidebar bg
// #C9FE6E  accent lime-green (primary highlight)
// #FFFFFF  content area bg / cards
// #BBEFFF  sky-blue accent (secondary)
// #71CFA3  mint-green accent (tertiary)

type MySquad = { id: string; name: string; role: "admin" | "member" };

/* ══════════════════════════════════════════════════════════════════════════════
   NAV ITEMS
══════════════════════════════════════════════════════════════════════════════ */
const mainLinks = [
  { to: "/dashboard",  label: "Dashboard",   icon: LayoutDashboard, always: true },
  { to: "/threads",    label: "Discussions", icon: MessageSquare,   squadRequired: true },
  { to: "/sheets",     label: "Practice",    icon: FileText,        squadRequired: true },
  { to: "/challenges", label: "Challenges",  icon: Swords,          squadRequired: true },
  { to: "/playground", label: "Playground",  icon: Terminal,        squadRequired: true },
  { to: "/leaderboard",label: "Rankings",    icon: Trophy,          squadRequired: true },
  { to: "/analytics",  label: "Analytics",   icon: BarChart3,       squadRequired: true },
  { to: "/calendar",   label: "Events",      icon: Calendar,        squadRequired: true },
];

const settingsLinks = [
  { to: "/settings/profile",     label: "My Profile",  icon: User,     always: true },
  { to: "/settings/connections", label: "Connections", icon: LinkIcon, always: true },
  { to: "/settings/squad",       label: "Squad",       icon: Users,    squadRequired: true },
];

/* ══════════════════════════════════════════════════════════════════════════════
   APP SHELL
══════════════════════════════════════════════════════════════════════════════ */
export function AppShell() {
  const selectedSquadId = useSquadStore((s) => s.selectedSquadId);
  const setSelectedSquadId = useSquadStore((s) => s.setSelectedSquadId);
  const mySquads = useSquadStore((s) => s.mySquads);
  const setMySquads = useSquadStore((s) => s.setMySquads);
  const { getToken, isSignedIn } = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  const unreadCount    = useNotificationStore((s) => s.unreadCount);
  const notifications  = useNotificationStore((s) => s.notifications);
  const bindNotifs     = useNotificationStore((s) => s.bind);
  const fetchList      = useNotificationStore((s) => s.fetchList);
  const fetchUnread    = useNotificationStore((s) => s.fetchUnreadCount);
  const markAllRead    = useNotificationStore((s) => s.markAllRead);
  const markRead       = useNotificationStore((s) => s.markRead);

  useThreadPostNotifications(getToken, Boolean(isSignedIn));
  usePushRegistration(getToken, Boolean(isSignedIn));

  const api = useMemo(() => createApiClient(() => getToken()), [getToken]);

  const [squadDropOpen,   setSquadDropOpen]   = useState(false);
  const [profileDropOpen, setProfileDropOpen] = useState(false);
  const [cmdOpen,         setCmdOpen]         = useState(false);
  const [notifOpen,       setNotifOpen]       = useState(false);

  const dropRef    = useRef<HTMLDivElement>(null);
  const notifRef   = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return (localStorage.getItem("theme") as "light" | "dark") || "light";
  });

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!isSignedIn) return;
    bindNotifs(api);
    void fetchUnread();
    void fetchList();
  }, [isSignedIn, api, bindNotifs, fetchUnread, fetchList]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setCmdOpen((o) => !o); }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (!isSignedIn) return;
    api.get("/squads/mine")
      .then((r) => setMySquads((r.data?.squads ?? []) as MySquad[]))
      .catch(() => {});
  }, [isSignedIn]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current    && !dropRef.current.contains(e.target as Node))    setSquadDropOpen(false);
      if (notifRef.current   && !notifRef.current.contains(e.target as Node))   setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileDropOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const currentSquad = mySquads.find((s) => s.id === selectedSquadId);
  const visibleSettings = settingsLinks.filter((l) => l.always || (l.squadRequired && selectedSquadId));

  // ── Main CardNav items for AppShell ───────────────────────────────────────
  const mainCardNavItems: CardNavItem[] = [
    {
      label: "Features",
      bgColor: "#FFFFFF",
      textColor: "#0E0E0E",
      links: [
        { label: "Discussions", onClick: () => navigate("/threads"), ariaLabel: "Discussions" },
        { label: "Practice Sheets", onClick: () => navigate("/sheets"), ariaLabel: "Practice Sheets" },
        { label: "Live Code Playground", onClick: () => navigate("/playground"), ariaLabel: "Code Playground" }
      ]
    },
    {
      label: "Compete",
      bgColor: "#F3F3F3",
      textColor: "#0E0E0E",
      links: [
        { label: "Squad Challenges", onClick: () => navigate("/challenges"), ariaLabel: "Squad Challenges" },
        { label: "Squad Rankings", onClick: () => navigate("/leaderboard"), ariaLabel: "Squad Rankings" },
        { label: "Contest Calendar", onClick: () => navigate("/calendar"), ariaLabel: "Contest Calendar" }
      ]
    },
    {
      label: "Account",
      bgColor: "#BBEFFF",
      textColor: "#0E0E0E",
      links: [
        { label: "My Profile", onClick: () => navigate("/settings/profile"), ariaLabel: "My Profile" },
        { label: "Connections", onClick: () => navigate("/settings/connections"), ariaLabel: "Connections" },
        { label: "Squad Settings", onClick: () => navigate("/settings/squad"), ariaLabel: "Squad Settings" }
      ]
    }
  ];

  const quickNavLinks = [
    { label: "Dashboard",   onClick: () => navigate("/dashboard"),   active: location.pathname === "/dashboard",   icon: <LayoutDashboard size={14} /> },
    { label: "Discussions", onClick: () => navigate("/threads"),     active: location.pathname.startsWith("/threads"),     icon: <MessageSquare size={14} /> },
    { label: "Practice",    onClick: () => navigate("/sheets"),      active: location.pathname.startsWith("/sheets"),      icon: <FileText size={14} /> },
    { label: "Challenges",  onClick: () => navigate("/challenges"),  active: location.pathname.startsWith("/challenges"),  icon: <Swords size={14} /> },
    { label: "Rankings",    onClick: () => navigate("/leaderboard"), active: location.pathname === "/leaderboard", icon: <Trophy size={14} /> },
  ];

  const rightHeaderControls = (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
      {/* Squad Switcher */}
      {mySquads.length > 0 && (
        <div style={{ position: "relative" }} ref={dropRef}>
          <button
            onClick={() => setSquadDropOpen((v) => !v)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "7px 11px", borderRadius: 10,
              background: "var(--p-grey)", border: "1px solid var(--p-border)",
              cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: "var(--p-ink2)",
            }}
          >
            <div style={{
              width: 20, height: 20, borderRadius: 5,
              background: "var(--p-lime)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 8, fontWeight: 900, color: "var(--p-ink)",
            }}>
              {(currentSquad?.name ?? "SQ").slice(0, 2).toUpperCase()}
            </div>
            <span style={{ maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {currentSquad?.name ?? "Select squad"}
            </span>
            <ChevronDown size={13} />
          </button>

          {squadDropOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 6px)", right: 0,
              width: 200, borderRadius: 12, border: "1px solid var(--p-border)",
              background: "var(--p-white)", boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
              overflow: "hidden", zIndex: 600,
            }}>
              {mySquads.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setSelectedSquadId(s.id); setSquadDropOpen(false); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    width: "100%", padding: "9px 12px", border: "none", cursor: "pointer",
                    background: s.id === selectedSquadId ? "var(--p-lime)" : "transparent",
                    fontSize: 12.5, fontWeight: 600, color: "var(--p-ink)",
                  }}
                >
                  <div style={{
                    width: 20, height: 20, borderRadius: 5,
                    background: s.id === selectedSquadId ? "rgba(0,0,0,0.12)" : "var(--p-grey)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 8, fontWeight: 900,
                  }}>
                    {(s.name ?? "SQ").slice(0, 2).toUpperCase()}
                  </div>
                  <span style={{ flex: 1, textAlign: "left" }}>{s.name}</span>
                  {s.id === selectedSquadId && <ChevronRight size={12} />}
                </button>
              ))}
              <div style={{ borderTop: "1px solid var(--p-border)" }}>
                <Link
                  to="/onboarding"
                  onClick={() => setSquadDropOpen(false)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "9px 12px", fontSize: 12.5, fontWeight: 600,
                    color: "var(--p-ink3)", textDecoration: "none",
                  }}
                >
                  <Plus size={13} /> Create or join squad
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <button className="ds-search" onClick={() => setCmdOpen(true)} id="topbar-search-btn">
        <Search size={14} strokeWidth={2} />
        <span>Search...</span>
        <kbd style={{
          marginLeft: "auto", fontSize: 10, fontWeight: 700,
          background: "var(--p-border)", borderRadius: 4,
          padding: "1px 5px", color: "var(--p-ink2)",
        }}>⌘K</kbd>
      </button>

      {/* Theme Toggle Button */}
      <button
        id="topbar-theme-toggle-btn"
        className="ds-icon-btn"
        onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        aria-label="Toggle theme"
      >
        {theme === "dark" ? <Sun size={17} style={{ color: "#C9FE6E" }} /> : <Moon size={17} />}
      </button>

      {/* Notifications */}
      <div style={{ position: "relative" }} ref={notifRef}>
        <button
          id="topbar-notif-btn"
          className="ds-icon-btn"
          onClick={() => { const o = !notifOpen; setNotifOpen(o); if (o) void fetchList(); }}
          aria-label="Notifications"
          style={{ position: "relative" }}
        >
          <Bell size={17} strokeWidth={1.8} />
          {unreadCount > 0 && <span className="ds-notif-dot" />}
        </button>

        {notifOpen && (
          <div className="ds-dropdown" style={{ width: 340, right: 0 }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 16px 10px",
              borderBottom: "1px solid var(--p-border)",
            }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "var(--p-ink)" }}>Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={() => void markAllRead()}
                  style={{ fontSize: 11, fontWeight: 700, color: "#3B82F6", border: "none", background: "none", cursor: "pointer" }}
                >
                  Mark all read
                </button>
              )}
            </div>
            <div style={{ maxHeight: 340, overflowY: "auto" }} className="ds-scroll">
              {notifications.length === 0 ? (
                <div style={{ padding: "32px 16px", textAlign: "center", fontSize: 13, color: "var(--p-ink3)", fontWeight: 600 }}>
                  You're all caught up 🎉
                </div>
              ) : notifications.map((n) => {
                const Icon = notifIcon(n.type);
                return (
                  <button
                    key={n.id}
                    onClick={() => { if (!n.read) void markRead([n.id]); setNotifOpen(false); if (n.link) navigate(n.link); }}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 12,
                      width: "100%", padding: "12px 16px",
                      background: n.read ? "transparent" : "rgba(201,254,110,0.15)",
                      border: "none", borderBottom: "1px solid var(--p-border)",
                      cursor: "pointer", textAlign: "left",
                    }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: "var(--p-grey)", display: "flex",
                      alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <Icon size={15} strokeWidth={1.8} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--p-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.title}</div>
                      <div style={{ fontSize: 11.5, color: "var(--p-ink3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.body}</div>
                      <div style={{ fontSize: 10, color: "var(--p-ink3)", marginTop: 2, textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600 }}>{formatRelativeTime(n.createdAt)}</div>
                    </div>
                    {!n.read && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#C9FE6E", marginTop: 4, flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Profile */}
      <div style={{ position: "relative" }} ref={profileRef}>
        <button
          id="topbar-profile-btn"
          onClick={() => setProfileDropOpen((p) => !p)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "4px 10px 4px 4px", borderRadius: 999,
            background: "var(--p-grey)", border: "1px solid var(--p-border)",
            cursor: "pointer",
          }}
        >
          <div className="ds-avatar">
            {user?.firstName ? user.firstName[0].toUpperCase() : "U"}
          </div>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--p-ink)", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user?.firstName ?? "User"}
          </span>
          <ChevronDown size={12} style={{ color: "var(--p-ink3)" }} />
        </button>

        {profileDropOpen && (
          <div className="ds-dropdown" style={{ width: 260 }}>
            {/* Header */}
            <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--p-border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: "linear-gradient(135deg,#C9FE6E,#71CFA3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 900, fontSize: 15, color: "var(--p-ink)", flexShrink: 0,
                }}>
                  {user?.firstName ? user.firstName[0].toUpperCase() : "U"}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "var(--p-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {user?.fullName || "Test User"}
                    </span>
                  </div>
                  <span style={{ fontSize: 11.5, color: "var(--p-ink3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                    {user?.primaryEmailAddress?.emailAddress || "user@example.com"}
                  </span>
                </div>
              </div>
            </div>

            {/* Links */}
            <div style={{ padding: "8px 8px" }}>
              {visibleSettings.map((l) => {
                const Icon = l.icon;
                return (
                  <button
                    key={l.to}
                    onClick={() => { navigate(l.to); setProfileDropOpen(false); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      width: "100%", padding: "9px 10px", borderRadius: 8,
                      background: "none", border: "none", cursor: "pointer",
                      fontSize: 13, fontWeight: 600, color: "var(--p-ink2)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--p-grey)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                  >
                    <Icon size={15} strokeWidth={1.8} style={{ color: "var(--p-ink3)" }} />
                    {l.label}
                  </button>
                );
              })}
            </div>

            {/* Upgrade */}
            <div style={{ padding: "8px 8px", borderTop: "1px solid var(--p-border)" }}>
              <button
                onClick={() => { navigate("/pricing"); setProfileDropOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  width: "100%", padding: "9px 10px", borderRadius: 8,
                  background: "var(--p-sky)", border: "none", cursor: "pointer",
                  fontSize: 12.5, fontWeight: 700, color: "var(--p-ink)",
                }}
              >
                <Zap size={13} /> Upgrade Plan
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        :root {
          --p-lime:  #C9FE6E;
          --p-sky:   #BBEFFF;
          --p-mint:  #71CFA3;
          --p-grey:  #F3F3F3;
          --p-white: #FFFFFF;
          --p-ink:   #0E0E0E;
          --p-ink2:  #3D3D3D;
          --p-ink3:  #727272;
          --p-border:#E4E4E4;
        }
        html.dark {
          --p-lime:  #C9FE6E;
          --p-sky:   #1A365D;
          --p-mint:  #14532D;
          --p-grey:  #20201F;
          --p-white: #2A2A29;
          --p-ink:   #FFFFFF;
          --p-ink2:  #E4E4E4;
          --p-ink3:  #A0A09F;
          --p-border:#3A3A39;
        }
        body { background: var(--p-grey); color: var(--p-ink); }
        .ds-search {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 7px 11px;
          border-radius: 10px;
          background: var(--p-grey);
          border: 1px solid var(--p-border);
          cursor: pointer;
          font-size: 12.5px;
          font-weight: 600;
          color: var(--p-ink3);
          white-space: nowrap;
          transition: background .15s, border-color .15s;
        }
        .ds-search:hover { background: #EAEAEA; border-color: #C4C4C4; }
        .ds-icon-btn {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: 1px solid transparent;
          cursor: pointer;
          color: var(--p-ink3);
          transition: background .15s, border-color .15s, color .15s;
        }
        .ds-icon-btn:hover { background: var(--p-grey); border-color: var(--p-border); color: var(--p-ink); }
        .ds-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--p-lime), var(--p-mint));
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 12px;
          color: var(--p-ink);
          flex-shrink: 0;
        }
        .ds-dropdown {
          position: absolute;
          right: 0;
          top: calc(100% + 8px);
          background: var(--p-white);
          border: 1px solid var(--p-border);
          border-radius: 14px;
          box-shadow: 0 8px 40px rgba(0,0,0,0.10);
          z-index: 600;
          overflow: hidden;
        }
        .ds-notif-dot {
          position: absolute;
          top: 5px;
          right: 5px;
          width: 8px;
          height: 8px;
          background: #FF4D4D;
          border-radius: 50%;
          border: 2px solid var(--p-white);
        }
        .ds-scroll::-webkit-scrollbar { width: 4px; }
        .ds-scroll::-webkit-scrollbar-track { background: transparent; }
        .ds-scroll::-webkit-scrollbar-thumb { background: var(--p-border); border-radius: 4px; }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: "var(--p-grey)" }}>

        {/* ── MAIN HEADER: REACT BITS CARDNAV AS PRIMARY NAVBAR ────────────── */}
        <header style={{ width: "100%", flexShrink: 0, zIndex: 500 }}>
          <CardNav
            logo="/logo.png"
            logoAlt="SquadCode Logo"
            brandTitle="SQUAD CODE"
            items={mainCardNavItems}
            quickLinks={quickNavLinks}
            rightContent={rightHeaderControls}
            baseColor={theme === "dark" ? "#20201F" : "#FFFFFF"}
            menuColor={theme === "dark" ? "#FFFFFF" : "#0E0E0E"}
            ease="power3.out"
            onLogoClick={() => navigate("/dashboard")}
          />
        </header>

          {/* ── MAIN CONTENT ─────────────────────────────────────────────── */}
          <main
            style={{
              flex: 1, overflowY: "auto",
              background: "var(--p-grey)",
              padding: "0",
            }}
            className="ds-scroll"
          >
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 28px 100px" }}>
              <Outlet />
            </div>
          </main>
        </div>

      {/* ── macOS Floating Dock Fixed at Bottom ───────────────────────────── */}
      <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center pointer-events-auto px-3">
        <FloatingDock
          items={[
            { title: "Dashboard",   icon: <LayoutDashboard className="h-full w-full" />, href: "/dashboard" },
            { title: "Discussions", icon: <MessageSquare className="h-full w-full" />,   href: "/threads" },
            { title: "Practice",    icon: <FileText className="h-full w-full" />,        href: "/sheets" },
            { title: "Challenges",  icon: <Swords className="h-full w-full" />,          href: "/challenges" },
            { title: "Playground",  icon: <Terminal className="h-full w-full" />,        href: "/playground" },
            { title: "Rankings",    icon: <Trophy className="h-full w-full" />,          href: "/leaderboard" },
            { title: "Analytics",   icon: <BarChart3 className="h-full w-full" />,       href: "/analytics" },
            { title: "Events",      icon: <Calendar className="h-full w-full" />,        href: "/calendar" },
          ]}
        />
      </div>

      {/* ── COMMAND PALETTE ────────────────────────────────────────────────── */}
      <CommandPalette
        isOpen={cmdOpen}
        onClose={() => setCmdOpen(false)}
        navigate={navigate}
        mySquads={mySquads}
        setSelectedSquadId={setSelectedSquadId}
        mainLinks={mainLinks}
        settingsLinks={settingsLinks}
      />
    </>
  );
}

/* ── Notification icon helper ──────────────────────────────────────────────── */
function notifIcon(type: string) {
  switch (type) {
    case "challenge_created": return Swords;
    case "thread_created":    return MessageSquare;
    case "thread_reply":      return MessageCircle;
    case "mention":           return AtSign;
    case "contest_reminder":  return CalendarClock;
    default:                  return Bell;
  }
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (isNaN(diff)) return "";
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

/* ══════════════════════════════════════════════════════════════════════════════
   COMMAND PALETTE
══════════════════════════════════════════════════════════════════════════════ */
function CommandPalette({ isOpen, onClose, navigate, mySquads, setSelectedSquadId, mainLinks, settingsLinks }: any) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) { setTimeout(() => inputRef.current?.focus(), 10); setQuery(""); }
  }, [isOpen]);

  if (!isOpen) return null;

  const allLinks = [...mainLinks, ...settingsLinks];
  const filteredLinks = allLinks.filter((l: any) => l.label.toLowerCase().includes(query.toLowerCase()));
  const filteredSquads = mySquads.filter((s: any) => (s?.name ?? "").toLowerCase().includes(query.toLowerCase()));

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 120 }}>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)" }} onClick={onClose} />
      <div style={{
        position: "relative", width: "100%", maxWidth: 520, margin: "0 16px",
        background: "var(--p-white)", borderRadius: 16,
        border: "1px solid var(--p-border)", boxShadow: "0 24px 60px rgba(0,0,0,0.12)",
        overflow: "hidden",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: "1px solid var(--p-border)" }}>
          <Search size={17} style={{ color: "var(--p-ink3)", flexShrink: 0 }} strokeWidth={1.8} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search pages, switch squads..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "Enter") {
                if (filteredLinks.length > 0) { navigate(filteredLinks[0].to); onClose(); }
                else if (filteredSquads.length > 0) { setSelectedSquadId(filteredSquads[0].id); onClose(); }
              }
            }}
            style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 14, fontWeight: 600, color: "var(--p-ink)", fontFamily: "inherit" }}
          />
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--p-ink3)" }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ maxHeight: 360, overflowY: "auto", padding: "8px 8px" }}>
          {query && filteredLinks.length === 0 && filteredSquads.length === 0 && (
            <div style={{ padding: "32px 16px", textAlign: "center", fontSize: 13, color: "var(--p-ink3)", fontWeight: 600 }}>
              No results for "{query}"
            </div>
          )}

          {filteredLinks.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--p-ink3)", padding: "6px 10px 4px" }}>Navigation</div>
              {filteredLinks.map((l: any) => {
                const Icon = l.icon;
                return (
                  <button
                    key={l.to}
                    onClick={() => { navigate(l.to); onClose(); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      width: "100%", padding: "9px 10px", borderRadius: 8,
                      background: "none", border: "none", cursor: "pointer",
                      fontSize: 13.5, fontWeight: 600, color: "var(--p-ink2)", textAlign: "left",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--p-grey)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                  >
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--p-grey)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon size={14} strokeWidth={1.8} />
                    </div>
                    {l.label}
                  </button>
                );
              })}
            </div>
          )}

          {filteredSquads.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--p-ink3)", padding: "6px 10px 4px" }}>Switch Squad</div>
              {filteredSquads.map((s: any) => (
                <button
                  key={s.id}
                  onClick={() => { setSelectedSquadId(s.id); onClose(); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    width: "100%", padding: "9px 10px", borderRadius: 8,
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 13.5, fontWeight: 600, color: "var(--p-ink2)", textAlign: "left",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--p-grey)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                >
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--p-lime)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 900, color: "var(--p-ink)" }}>
                    {(s?.name ?? "SQ").slice(0, 2).toUpperCase()}
                  </div>
                  {s?.name ?? "Squad"}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

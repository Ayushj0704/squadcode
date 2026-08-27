import { Navigate, Route, Routes } from "react-router-dom";
import { SignedIn, SignedOut } from "./auth";
import { LandingPage } from "./pages/LandingPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ConnectionsPage } from "./pages/ConnectionsPage";
import { AppShell } from "./components/AppShell";
import { ThreadsListPage } from "./pages/ThreadsListPage";
import { ThreadDetailPage } from "./pages/ThreadDetailPage";
import { SheetsListPage } from "./pages/SheetsListPage";
import { SheetDetailPage } from "./pages/SheetDetailPage";
import {
  LegacySquadDashboardRedirect,
  LegacySquadSheetsRedirect,
  LegacySquadSheetDetailRedirect,
  LegacySquadThreadsRedirect,
  LegacySquadThreadDetailRedirect
} from "./pages/LegacySquadRoutes";
import { PlaygroundPage } from "./pages/PlaygroundPage";
import { CalendarPage } from "./pages/CalendarPage";
import { LeaderboardPage } from "./pages/LeaderboardPage";

export default function App() {
  const missingClerkKey = !import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (missingClerkKey) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-xl w-full rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <h1 className="text-xl font-semibold">SquadCode setup</h1>
          <p className="mt-2 text-slate-300">
            Missing{" "}
            <code className="text-slate-100">VITE_GOOGLE_CLIENT_ID</code>.
            Add it to <code className="text-slate-100">apps/web/.env</code> (or
            root <code className="text-slate-100">.env</code>) and restart.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <>
            <SignedOut>
              <LandingPage />
            </SignedOut>
            <SignedIn>
              <Navigate to="/onboarding" replace />
            </SignedIn>
          </>
        }
      />

      <Route
        element={
          <SignedIn>
            <AppShell />
          </SignedIn>
        }
      >
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/settings/connections" element={<ConnectionsPage />} />

        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/threads" element={<ThreadsListPage />} />
        <Route path="/threads/:thread_id" element={<ThreadDetailPage />} />
        <Route path="/sheets" element={<SheetsListPage />} />
        <Route path="/sheets/:sheet_id" element={<SheetDetailPage />} />
        <Route path="/playground" element={<PlaygroundPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />

        {/* Legacy URLs (keep old links working) */}
        <Route path="/squad/:id" element={<LegacySquadDashboardRedirect />} />
        <Route path="/squad/:id/threads" element={<LegacySquadThreadsRedirect />} />
        <Route path="/squad/:id/threads/:thread_id" element={<LegacySquadThreadDetailRedirect />} />
        <Route path="/squad/:id/sheets" element={<LegacySquadSheetsRedirect />} />
        <Route path="/squad/:id/sheets/:sheet_id" element={<LegacySquadSheetDetailRedirect />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

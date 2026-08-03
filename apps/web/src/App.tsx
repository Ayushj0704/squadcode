import { Navigate, Route, Routes, useParams, useNavigate } from "react-router-dom";
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { Suspense, lazy, useEffect } from "react";
import { LandingPage } from "./pages/LandingPage";
import { AppShell } from "./components/AppShell";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Route-level code splitting for fast initial page load
const OnboardingPage = lazy(() => import("./pages/OnboardingPage").then((m) => ({ default: m.OnboardingPage })));
const DashboardPage = lazy(() => import("./pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const ConnectionsPage = lazy(() => import("./pages/ConnectionsPage").then((m) => ({ default: m.ConnectionsPage })));
const ThreadsListPage = lazy(() => import("./pages/ThreadsListPage").then((m) => ({ default: m.ThreadsListPage })));
const ThreadDetailPage = lazy(() => import("./pages/ThreadDetailPage").then((m) => ({ default: m.ThreadDetailPage })));
const SheetsListPage = lazy(() => import("./pages/SheetsListPage").then((m) => ({ default: m.SheetsListPage })));
const SheetDetailPage = lazy(() => import("./pages/SheetDetailPage").then((m) => ({ default: m.SheetDetailPage })));
const SquadSettingsPage = lazy(() => import("./pages/SquadSettingsPage").then((m) => ({ default: m.SquadSettingsPage })));
const PlaygroundPage = lazy(() => import("./pages/PlaygroundPage").then((m) => ({ default: m.PlaygroundPage })));
const CalendarPage = lazy(() => import("./pages/CalendarPage").then((m) => ({ default: m.CalendarPage })));
const LeaderboardPage = lazy(() => import("./pages/LeaderboardPage").then((m) => ({ default: m.LeaderboardPage })));
const ChallengesPage = lazy(() => import("./pages/ChallengesPage").then((m) => ({ default: m.ChallengesPage })));
const ChallengeDetailPage = lazy(() => import("./pages/ChallengeDetailPage").then((m) => ({ default: m.ChallengeDetailPage })));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage").then((m) => ({ default: m.AnalyticsPage })));
const PublicProfilePage = lazy(() => import("./pages/PublicProfilePage").then((m) => ({ default: m.PublicProfilePage })));
const ProfileSettingsPage = lazy(() => import("./pages/ProfileSettingsPage").then((m) => ({ default: m.ProfileSettingsPage })));
const PricingPage = lazy(() => import("./pages/PricingPage").then((m) => ({ default: m.PricingPage })));
const {
  LegacySquadDashboardRedirect,
  LegacySquadSheetsRedirect,
  LegacySquadSheetDetailRedirect,
  LegacySquadThreadsRedirect,
  LegacySquadThreadDetailRedirect
} = {
  LegacySquadDashboardRedirect: lazy(() => import("./pages/LegacySquadRoutes").then((m) => ({ default: m.LegacySquadDashboardRedirect }))),
  LegacySquadSheetsRedirect: lazy(() => import("./pages/LegacySquadRoutes").then((m) => ({ default: m.LegacySquadSheetsRedirect }))),
  LegacySquadSheetDetailRedirect: lazy(() => import("./pages/LegacySquadRoutes").then((m) => ({ default: m.LegacySquadSheetDetailRedirect }))),
  LegacySquadThreadsRedirect: lazy(() => import("./pages/LegacySquadRoutes").then((m) => ({ default: m.LegacySquadThreadsRedirect }))),
  LegacySquadThreadDetailRedirect: lazy(() => import("./pages/LegacySquadRoutes").then((m) => ({ default: m.LegacySquadThreadDetailRedirect })))
};

function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label="Loading">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
    </div>
  );
}

function JoinSquadRedirect() {
  const { inviteCode } = useParams();
  const navigate = useNavigate();
  useEffect(() => {
    navigate(`/onboarding?inviteCode=${inviteCode}`, { replace: true });
  }, [inviteCode, navigate]);
  return null;
}

export default function App() {
  const missingClerkKey = !import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  if (missingClerkKey) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-xl w-full rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <h1 className="text-xl font-semibold">SquadCode setup</h1>
          <p className="mt-2 text-slate-300">
            Missing{" "}
            <code className="text-slate-100">VITE_CLERK_PUBLISHABLE_KEY</code>.
            Add it to <code className="text-slate-100">apps/web/.env</code> (or
            root <code className="text-slate-100">.env</code>) and restart.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route
            path="/"
            element={
              <>
                <SignedOut>
                  <LandingPage />
                </SignedOut>
                <SignedIn>
                  <Navigate to="/dashboard" replace />
                </SignedIn>
              </>
            }
          />

          {/* Public invite link redirect */}
          <Route path="/join/:inviteCode" element={<JoinSquadRedirect />} />

          {/* Public profile page */}
          <Route path="/u/:username" element={<PublicProfilePage />} />

          {/* Authenticated app shell and pages */}
          <Route
            element={
              <SignedIn>
                <AppShell />
              </SignedIn>
            }
          >
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/settings/profile" element={<ProfileSettingsPage />} />
            <Route path="/settings/connections" element={<ConnectionsPage />} />
            <Route path="/settings/squad" element={<SquadSettingsPage />} />
            <Route path="/pricing" element={<PricingPage />} />

            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/threads" element={<ThreadsListPage />} />
            <Route path="/threads/:thread_id" element={<ThreadDetailPage />} />
            <Route path="/sheets" element={<SheetsListPage />} />
            <Route path="/sheets/:sheet_id" element={<SheetDetailPage />} />
            <Route path="/playground" element={<PlaygroundPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/challenges" element={<ChallengesPage />} />
            <Route path="/challenges/:challenge_id" element={<ChallengeDetailPage />} />

            {/* Legacy URLs */}
            <Route path="/squad/:id" element={<LegacySquadDashboardRedirect />} />
            <Route path="/squad/:id/threads" element={<LegacySquadThreadsRedirect />} />
            <Route path="/squad/:id/threads/:thread_id" element={<LegacySquadThreadDetailRedirect />} />
            <Route path="/squad/:id/sheets" element={<LegacySquadSheetsRedirect />} />
            <Route path="/squad/:id/sheets/:sheet_id" element={<LegacySquadSheetDetailRedirect />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

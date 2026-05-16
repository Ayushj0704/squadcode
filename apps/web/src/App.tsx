import { Navigate, Route, Routes } from "react-router-dom";
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { LandingPage } from "./pages/LandingPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { SquadDashboardPage } from "./pages/SquadDashboardPage";
import { ConnectionsPage } from "./pages/ConnectionsPage";
import { AppShell } from "./components/AppShell";
import { ThreadsListPage } from "./pages/ThreadsListPage";
import { ThreadDetailPage } from "./pages/ThreadDetailPage";
import { SheetsListPage } from "./pages/SheetsListPage";
import { SheetDetailPage } from "./pages/SheetDetailPage";

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
        <Route path="/squad/:id" element={<SquadDashboardPage />} />
        <Route path="/squad/:id/threads" element={<ThreadsListPage />} />
        <Route path="/squad/:id/threads/:thread_id" element={<ThreadDetailPage />} />
        <Route path="/squad/:id/sheets" element={<SheetsListPage />} />
        <Route path="/squad/:id/sheets/:sheet_id" element={<SheetDetailPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

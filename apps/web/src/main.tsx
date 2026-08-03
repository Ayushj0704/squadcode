import * as Sentry from "@sentry/react";

const sentryDsn = import.meta.env.VITE_SENTRY_DSN?.trim();

Sentry.init({
  dsn: sentryDsn,
  enabled: !!sentryDsn,
  environment: import.meta.env.MODE,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false }),
  ],
  tracesSampleRate: 0.2,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App";
import { UpgradeModalProvider } from "./components/UpgradeModal";
import { ToastProvider, DialogProvider } from "./components/ui/Notifications";
import "./index.css";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function Root() {
  if (!PUBLISHABLE_KEY) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 font-sans">
        <div className="max-w-xl w-full rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <h1 className="text-xl font-semibold">SquadCode setup</h1>
          <p className="mt-2 text-slate-300">
            Missing{" "}
            <code className="text-slate-100 bg-slate-800 px-1.5 py-0.5 rounded">
              VITE_CLERK_PUBLISHABLE_KEY
            </code>.
            Add it to <code className="text-slate-100 bg-slate-800 px-1.5 py-0.5 rounded">apps/web/.env</code> (or
            root <code className="text-slate-100 bg-slate-800 px-1.5 py-0.5 rounded">.env</code>) and restart.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <BrowserRouter>
        <ToastProvider>
          <DialogProvider>
            <UpgradeModalProvider>
              <App />
            </UpgradeModalProvider>
          </DialogProvider>
        </ToastProvider>
      </BrowserRouter>
    </ClerkProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);

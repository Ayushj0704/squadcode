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
import App from "./App";
import { UpgradeModalProvider } from "./components/UpgradeModal";
import { ToastProvider, DialogProvider } from "./components/ui/Notifications";
import "./index.css";

// ⚠️ AUTH DISABLED FOR TESTING — ClerkProvider removed
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <DialogProvider>
          <UpgradeModalProvider>
            <App />
          </UpgradeModalProvider>
        </DialogProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);

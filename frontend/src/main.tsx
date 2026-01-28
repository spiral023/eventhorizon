import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import * as Sentry from "@sentry/react";

// Initialize Sentry
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || "development",
    enableMetrics: true,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: parseFloat(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || "0.1"),
    // Session Replay
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
    // Release tracking
    release: import.meta.env.VITE_APP_VERSION || "1.0.0",
    // Tunnel to bypass ad-blockers
    tunnel: "/api/v1/sentry-tunnel",
  });
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      if (import.meta.env.DEV) {
        console.log('SW registered: ', registration);
      }
    }).catch(registrationError => {
      if (import.meta.env.DEV) {
        console.log('SW registration failed: ', registrationError);
      }
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);

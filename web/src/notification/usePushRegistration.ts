import { useEffect, useRef } from "react";
import { getToken as getFcmToken } from "firebase/messaging";
import { messaging } from "./firebase";
import { apiBaseUrl } from "../lib/api";

/**
 * Requests notification permission, obtains a Firebase Cloud Messaging (Web
 * Push) token, and registers it with the backend for the signed-in user.
 *
 * Runs inside the authenticated app shell so it can attach the Clerk JWT.
 * Safe no-op when the browser lacks support, permission is denied, or the
 * VAPID key isn't configured.
 */
export function usePushRegistration(
  getClerkToken: () => Promise<string | null>,
  enabled: boolean
) {
  // Track the last registered FCM token so we can unregister it on sign-out.
  const registeredTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function register() {
      if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
      if (Notification.permission === "denied") return;

      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
      if (!vapidKey) {
        console.warn(
          "[push] Missing VITE_FIREBASE_VAPID_KEY — Web Push disabled. Add your Firebase Web Push certificate key."
        );
        return;
      }

      try {
        const permission =
          Notification.permission === "granted"
            ? "granted"
            : await Notification.requestPermission();
        if (permission !== "granted" || cancelled) return;

        const serviceWorkerRegistration = await navigator.serviceWorker.register(
          "/firebase-messaging-sw.js"
        );

        if (!messaging) return;
        const fcmToken = await getFcmToken(messaging, {
          vapidKey,
          serviceWorkerRegistration,
        });
        if (!fcmToken || cancelled) return;

        const clerkToken = await getClerkToken();
        if (!clerkToken || cancelled) return;

        await fetch(`${apiBaseUrl()}/api/notifications/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${clerkToken}`,
          },
          body: JSON.stringify({ token: fcmToken }),
        });

        // Remember the token so cleanup can unregister it.
        registeredTokenRef.current = fcmToken;
      } catch (err) {
        console.error("[push] registration failed", err);
      }
    }

    void register();

    return () => {
      cancelled = true;

      // Unregister the FCM token when the user signs out or the shell unmounts
      // so stale tokens don't accumulate in the database.
      const token = registeredTokenRef.current;
      if (!token) return;
      registeredTokenRef.current = null;

      // Best-effort fire-and-forget — don't block unmount on the network call.
      getClerkToken()
        .then((clerkToken) => {
          if (!clerkToken) return;
          return fetch(`${apiBaseUrl()}/api/notifications/register`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${clerkToken}`,
            },
            body: JSON.stringify({ token }),
          });
        })
        .catch(() => {
          // Silent — best-effort cleanup only.
        });
    };
  }, [enabled, getClerkToken]);
}

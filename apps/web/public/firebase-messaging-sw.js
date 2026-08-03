/* Firebase Cloud Messaging service worker.
 * Keep this file at the web root so navigator.serviceWorker.register("/firebase-messaging-sw.js")
 * can find it.
 *
 * Service workers can't use ES module imports or Vite env vars, so we load the
 * Firebase "compat" SDKs over importScripts and inline the (public) web config —
 * these values are safe to expose; they only identify the Firebase project.
 */
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAzpTQEbjv7PetT6T85YSvJbZaCUY-31to",
  authDomain: "squadcode-d454e.firebaseapp.com",
  projectId: "squadcode-d454e",
  storageBucket: "squadcode-d454e.firebasestorage.app",
  messagingSenderId: "618869907810",
  appId: "1:618869907810:web:73fc02db2e16cd84f38c3b",
  measurementId: "G-39ERSLF5QL",
});

const messaging = firebase.messaging();

// Fired when a push arrives while the site is in the background / closed.
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? payload.data?.title ?? "SquadCode";
  const options = {
    body: payload.notification?.body ?? payload.data?.body ?? "",
    icon: "/logo.png",
    badge: "/logo.png",
    data: { url: payload.fcmOptions?.link ?? payload.data?.url ?? "/dashboard" },
  };
  self.registration.showNotification(title, options);
});

// Focus (or open) the app when the user taps a notification.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // WindowClient has .navigate(); base Client does not.
      for (const client of clientList) {
        if (client.url && "navigate" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

import { useEffect } from "react";
import { apiBaseUrl } from "./api";
import { useNotificationStore } from "../store/notificationStore";

type ThreadPostEvent = {
  type: "thread-post" | "notification";
  squadId?: string;
  threadId?: string;
  postId?: string;
  authorUsername?: string;
  createdAt?: string;
};

export function useThreadPostNotifications(
  getToken: () => Promise<string | null>,
  enabled: boolean
) {
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let abortController: AbortController | null = null;
    let retryTimer: number | null = null;
    // Exponential backoff: start at 5s, double each failure, cap at 60s.
    let retryDelayMs = 5_000;

    primeAudioOnInteraction();

    async function connect() {
      try {
        const token = await getToken();
        if (cancelled || !token) return;

        abortController = new AbortController();
        const res = await fetch(`${apiBaseUrl()}/api/threads/events/stream`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: abortController.signal
        });

        if (!res.ok || !res.body) {
          // Non-ok HTTP status (400, 503, etc.) — NOT a permanent failure.
          // Honour a Retry-After header if present (e.g. 503 from the server when
          // the user hasn't completed /auth/sync yet).
          const retryAfterHeader = res.headers.get("Retry-After");
          const serverDelay = retryAfterHeader
            ? parseInt(retryAfterHeader, 10) * 1_000
            : null;

          // Only log the first time (retryDelayMs === 5_000) to avoid console spam.
          if (retryDelayMs === 5_000) {
            console.warn(
              `[ThreadSSE] stream responded with ${res.status}. Will retry. Hint: ${
                res.status === 503
                  ? "User not yet synced — complete onboarding first."
                  : "Unexpected server error."
              }`
            );
          }

          scheduleRetry(serverDelay ?? retryDelayMs);
          return;
        }

        // Connection succeeded — reset backoff.
        retryDelayMs = 5_000;

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (!cancelled) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const chunks = buffer.split("\n\n");
          buffer = chunks.pop() ?? "";
          for (const chunk of chunks) {
            const event = parseServerSentEvent(chunk);
            // "notification" events are addressed to this user specifically
            // (server-filtered to the recipients of an in-app notification) —
            // ring the bell and play a sound.
            if (event?.type === "notification") {
              useNotificationStore.getState().onLiveEvent();
              playNotificationSound();
            } else if (event?.type === "thread-post") {
              // "thread-post" is broadcast to every squad member to drive silent
              // live-refresh of an open thread view. It must NOT ring the bell or
              // play a sound — that would alert people who aren't in the thread.
              useNotificationStore.getState().onThreadPost();
            }
          }
        }
      } catch {
        // Network error or AbortError (from cleanup). If cancelled, don't retry.
      }

      if (!cancelled) {
        scheduleRetry(retryDelayMs);
      }
    }

    function scheduleRetry(delayMs: number) {
      if (cancelled) return;
      // Grow the backoff for next time, capped at 60 seconds.
      retryDelayMs = Math.min(retryDelayMs * 2, 60_000);
      retryTimer = window.setTimeout(connect, delayMs);
    }

    void connect();

    return () => {
      cancelled = true;
      abortController?.abort();
      if (retryTimer) window.clearTimeout(retryTimer);
    };
  }, [enabled, getToken]);
}

function parseServerSentEvent(chunk: string): ThreadPostEvent | null {
  const dataLine = chunk
    .split("\n")
    .find((line) => line.startsWith("data: "));
  if (!dataLine) return null;

  try {
    return JSON.parse(dataLine.slice(6)) as ThreadPostEvent;
  } catch {
    return null;
  }
}

let audioContext: AudioContext | null = null;

function getAudioContext() {
  const AudioContextCtor =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return null;
  audioContext = audioContext ?? new AudioContextCtor();
  return audioContext;
}

function primeAudioOnInteraction() {
  const prime = () => {
    void getAudioContext()?.resume().catch(() => {});
  };
  window.addEventListener("pointerdown", prime, { once: true });
  window.addEventListener("keydown", prime, { once: true });
}

function playNotificationSound() {
  const context = getAudioContext();
  if (!context) return;

  void context.resume().then(() => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(660, context.currentTime + 0.18);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.24);
  });
}

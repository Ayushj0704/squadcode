import { useEffect } from "react";
import { apiBaseUrl } from "./api";

type ThreadPostEvent = {
  type: "thread-post";
  squadId: string;
  threadId: string;
  postId: string;
  authorUsername: string;
  createdAt: string;
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

        if (!res.ok || !res.body) throw new Error("Notification stream failed");

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
            if (event?.type === "thread-post") {
              playNotificationSound();
            }
          }
        }
      } catch {
        if (!cancelled) {
          retryTimer = window.setTimeout(connect, 5_000);
        }
      }
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

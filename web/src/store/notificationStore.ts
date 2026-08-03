import { create } from "zustand";
import type { AxiosInstance } from "axios";

export type AppNotification = {
  id: string;
  type: "challenge_created" | "thread_created" | "thread_reply" | "mention" | "contest_reminder" | string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  squadId: string | null;
  actorUserId: string | null;
  createdAt: string;
};

// Cache-busting param: the shared api client caches GETs for 60s and only
// invalidates on the same client's mutations. Notifications are created by other
// users on the server, so we must force a fresh fetch — otherwise the bell can
// lag up to a minute behind a live SSE signal.
function noCache() {
  return { _t: Date.now() };
}

type NotificationState = {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  nextCursor: string | null;
  api: AxiosInstance | null;
  /**
   * Bumped to Date.now() whenever a live thread-post SSE event arrives. Open
   * thread views watch this to silently refetch their posts. This is distinct
   * from the notification bell: thread-post events are broadcast to every squad
   * member for live-thread refresh, whereas the bell is driven by per-user
   * "notification" events.
   */
  lastThreadEvent: number;

  bind: (api: AxiosInstance) => void;
  fetchList: () => Promise<void>;
  fetchMore: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markRead: (ids: string[]) => Promise<void>;
  markAllRead: () => Promise<void>;
  /** Called on a live per-user notification SSE signal — refresh badge + list. */
  onLiveEvent: () => void;
  /** Called on a live thread-post SSE signal — triggers open-thread refresh. */
  onThreadPost: () => void;
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  nextCursor: null,
  api: null,
  lastThreadEvent: 0,

  bind: (api) => set({ api }),

  fetchList: async () => {
    const api = get().api;
    if (!api) return;
    set({ loading: true });
    try {
      const res = await api.get("/notifications", { params: noCache() });
      set({
        notifications: (res.data?.notifications ?? []) as AppNotification[],
        nextCursor: res.data?.nextCursor ?? null,
      });
    } catch {
      /* transient — leave existing list in place */
    } finally {
      set({ loading: false });
    }
  },

  fetchMore: async () => {
    const { api, nextCursor, notifications } = get();
    if (!api || !nextCursor) return;
    try {
      const res = await api.get("/notifications", { params: { cursor: nextCursor } });
      set({
        notifications: [...notifications, ...((res.data?.notifications ?? []) as AppNotification[])],
        nextCursor: res.data?.nextCursor ?? null,
      });
    } catch {
      /* ignore */
    }
  },

  fetchUnreadCount: async () => {
    const api = get().api;
    if (!api) return;
    try {
      const res = await api.get("/notifications/unread-count", { params: noCache() });
      set({ unreadCount: res.data?.count ?? 0 });
    } catch {
      /* ignore */
    }
  },

  markRead: async (ids) => {
    const api = get().api;
    if (!api || ids.length === 0) return;
    // Optimistic update.
    set((s) => {
      const newlyRead = ids.filter((id) => s.notifications.find((n) => n.id === id && !n.read)).length;
      return {
        notifications: s.notifications.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)),
        unreadCount: Math.max(0, s.unreadCount - newlyRead),
      };
    });
    try {
      await api.post("/notifications/read", { ids });
    } catch {
      /* best-effort; a later refetch will reconcile */
    }
  },

  markAllRead: async () => {
    const api = get().api;
    if (!api) return;
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
    try {
      await api.post("/notifications/read-all");
    } catch {
      /* ignore */
    }
  },

  onLiveEvent: () => {
    void get().fetchUnreadCount();
    void get().fetchList();
  },

  onThreadPost: () => {
    set({ lastThreadEvent: Date.now() });
  },
}));

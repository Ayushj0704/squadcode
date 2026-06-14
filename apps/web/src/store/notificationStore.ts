import { create } from "zustand";

type NotificationState = {
  lastThreadEvent: number;
  unreadCount: number;
  increment: () => void;
  clearUnread: () => void;
};

export const useNotificationStore = create<NotificationState>((set) => ({
  lastThreadEvent: 0,
  unreadCount: 0,
  increment: () =>
    set((s) => ({
      lastThreadEvent: Date.now(),
      unreadCount: s.unreadCount + 1,
    })),
  clearUnread: () => set({ unreadCount: 0 }),
}));
